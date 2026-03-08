import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { QuoteRequestStatus } from '@prisma/client';
import { buildCsv, csvRow } from 'src/common/utils/csv.util';

type DashboardStatsData = {
  summary: {
    totalQuotes: number;
    newQuotes: number;
    quotesThisWeek: number;
  };
  quotesByStatus: Record<QuoteRequestStatus, number>;
  topRequestedProducts: {
    productId: string;
    productName: string;
    productSlug: string;
    totalRequestedQuantity: number;
    totalQuoteLines: number;
  }[];
  quoteRequests: {
    id: string;
    customerName: string;
    customerEmail: string | null;
    customerPhone: string;
    customerCity: string | null;
    status: QuoteRequestStatus;
    source: string;
    itemsCount: number;
    totalRequestedQuantity: number;
    notes: string | null;
    internalNotes: string[];
    createdAt: Date;
    updatedAt: Date;
  }[];
};

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private async buildStatsData(): Promise<DashboardStatsData> {
    const now = new Date();

    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = day === 0 ? 6 : day - 1;
    startOfWeek.setDate(now.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const [
      totalQuotes,
      newQuotes,
      quotesThisWeek,
      contactedQuotes,
      quotedQuotes,
      closedQuotes,
      rejectedQuotes,
      topRequestedProductsRaw,
      quoteRequestsRaw,
    ] = await Promise.all([
      this.prisma.quoteRequest.count(),
      this.prisma.quoteRequest.count({
        where: { status: QuoteRequestStatus.NEW },
      }),
      this.prisma.quoteRequest.count({
        where: {
          createdAt: {
            gte: startOfWeek,
          },
        },
      }),
      this.prisma.quoteRequest.count({
        where: { status: QuoteRequestStatus.CONTACTED },
      }),
      this.prisma.quoteRequest.count({
        where: { status: QuoteRequestStatus.QUOTED },
      }),
      this.prisma.quoteRequest.count({
        where: { status: QuoteRequestStatus.CLOSED },
      }),
      this.prisma.quoteRequest.count({
        where: { status: QuoteRequestStatus.REJECTED },
      }),
      this.prisma.quoteRequestItem.groupBy({
        by: ['productId', 'productNameSnapshot', 'productSlugSnapshot'],
        _sum: {
          quantity: true,
        },
        _count: {
          _all: true,
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: 5,
      }),
      this.prisma.quoteRequest.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          customerName: true,
          customerEmail: true,
          customerPhone: true,
          customerCity: true,
          status: true,
          source: true,
          notes: true,
          internalNotes: true,
          createdAt: true,
          updatedAt: true,
          items: {
            select: {
              quantity: true,
            },
          },
        },
      }),
    ]);

    const topRequestedProducts = topRequestedProductsRaw.map((item) => ({
      productId: item.productId,
      productName: item.productNameSnapshot,
      productSlug: item.productSlugSnapshot,
      totalRequestedQuantity: item._sum.quantity ?? 0,
      totalQuoteLines: item._count._all,
    }));

    const quoteRequests = quoteRequestsRaw.map((quoteRequest) => ({
      id: quoteRequest.id,
      customerName: quoteRequest.customerName,
      customerEmail: quoteRequest.customerEmail,
      customerPhone: quoteRequest.customerPhone,
      customerCity: quoteRequest.customerCity,
      status: quoteRequest.status,
      source: quoteRequest.source,
      itemsCount: quoteRequest.items.length,
      totalRequestedQuantity: quoteRequest.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      ),
      notes: quoteRequest.notes,
      internalNotes: quoteRequest.internalNotes ?? [],
      createdAt: quoteRequest.createdAt,
      updatedAt: quoteRequest.updatedAt,
    }));

    return {
      summary: {
        totalQuotes,
        newQuotes,
        quotesThisWeek,
      },
      quotesByStatus: {
        NEW: newQuotes,
        CONTACTED: contactedQuotes,
        QUOTED: quotedQuotes,
        CLOSED: closedQuotes,
        REJECTED: rejectedQuotes,
      },
      topRequestedProducts,
      quoteRequests,
    };
  }

  async getStats() {
    const data = await this.buildStatsData();
    return { data };
  }

  async exportStatsCsv() {
    const data = await this.buildStatsData();

    const summarySection = buildCsv(
      ['section', 'metric', 'value'],
      [
        ['summary', 'totalQuotes', data.summary.totalQuotes],
        ['summary', 'newQuotes', data.summary.newQuotes],
        ['summary', 'quotesThisWeek', data.summary.quotesThisWeek],
      ],
    );

    const statusSection = buildCsv(
      ['section', 'status', 'count'],
      (
        Object.entries(data.quotesByStatus) as [QuoteRequestStatus, number][]
      ).map(([status, count]) => ['quotesByStatus', status, count]),
    );

    const topProductsSection = buildCsv(
      [
        'section',
        'productId',
        'productName',
        'productSlug',
        'totalRequestedQuantity',
        'totalQuoteLines',
      ],
      data.topRequestedProducts.map((item) => [
        'topRequestedProducts',
        item.productId,
        item.productName,
        item.productSlug,
        item.totalRequestedQuantity,
        item.totalQuoteLines,
      ]),
    );

    const quoteRequestsSection = buildCsv(
      [
        'section',
        'id',
        'customerName',
        'customerEmail',
        'customerPhone',
        'customerCity',
        'status',
        'source',
        'itemsCount',
        'totalRequestedQuantity',
        'notes',
        'internalNotes',
        'createdAt',
        'updatedAt',
      ],
      data.quoteRequests.map((quoteRequest) => [
        'quoteRequests',
        quoteRequest.id,
        quoteRequest.customerName,
        quoteRequest.customerEmail ?? '',
        quoteRequest.customerPhone,
        quoteRequest.customerCity ?? '',
        quoteRequest.status,
        quoteRequest.source,
        quoteRequest.itemsCount,
        quoteRequest.totalRequestedQuantity,
        quoteRequest.notes ?? '',
        quoteRequest.internalNotes.join(' | '),
        quoteRequest.createdAt,
        quoteRequest.updatedAt,
      ]),
    );

    return [
      summarySection,
      '',
      csvRow(['# ----']),
      '',
      statusSection,
      '',
      csvRow(['# ----']),
      '',
      topProductsSection,
      '',
      csvRow(['# ----']),
      '',
      quoteRequestsSection,
    ].join('\n');
  }
}
