import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { QuoteRequestStatus } from '@prisma/client';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
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
    ]);

    const topRequestedProducts = topRequestedProductsRaw.map((item) => ({
      productId: item.productId,
      productName: item.productNameSnapshot,
      productSlug: item.productSlugSnapshot,
      totalRequestedQuantity: item._sum.quantity ?? 0,
      totalQuoteLines: item._count._all,
    }));

    return {
      data: {
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
      },
    };
  }
}
