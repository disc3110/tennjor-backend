import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DiscountType,
  InternalSaleQuoteStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateInternalSaleQuoteDto } from './dto/create-internal-sale-quote.dto';
import { FindInternalSaleQuotesDto } from './dto/find-internal-sale-quotes.dto';
import { UpdateInternalSaleQuoteDto } from './dto/update-internal-sale-quote.dto';
import { CreateInternalSaleQuoteItemDto } from './dto/create-internal-sale-quote-item.dto';
import { UpdateInternalSaleQuoteItemDto } from './dto/update-internal-sale-quote-item.dto';

@Injectable()
export class SalesQuotesService {
  constructor(private readonly prisma: PrismaService) {}

  private assertEditableStatus(status: InternalSaleQuoteStatus) {
    if (status !== InternalSaleQuoteStatus.DRAFT) {
      throw new BadRequestException(
        'Quote is not editable. Only DRAFT quotes can be modified.',
      );
    }
  }

  private toNumber(value: Prisma.Decimal | number | null | undefined): number {
    if (value === null || value === undefined) {
      return 0;
    }
    return Number(value);
  }

  private computeDiscountAmount(input: {
    grossLineRevenue: number;
    discountType?: DiscountType | null;
    discountValue?: Prisma.Decimal | number | null;
  }): number {
    if (!input.discountType || input.discountValue === null || input.discountValue === undefined) {
      return 0;
    }

    const discountValue = this.toNumber(input.discountValue);
    if (discountValue <= 0) {
      return 0;
    }

    if (input.discountType === DiscountType.FIXED) {
      return Math.min(discountValue, input.grossLineRevenue);
    }

    const raw = (input.grossLineRevenue * discountValue) / 100;
    return Math.min(raw, input.grossLineRevenue);
  }

  private computeLineFinancials(input: {
    quantity: number;
    unitSalePrice: number;
    unitCostSnapshot: number;
    discountType?: DiscountType | null;
    discountValue?: Prisma.Decimal | number | null;
  }) {
    const grossLineRevenue = input.quantity * input.unitSalePrice;
    const discountAmount = this.computeDiscountAmount({
      grossLineRevenue,
      discountType: input.discountType,
      discountValue: input.discountValue,
    });
    const lineRevenue = grossLineRevenue - discountAmount;
    const lineCost = input.quantity * input.unitCostSnapshot;
    const lineProfit = lineRevenue - lineCost;

    return {
      grossLineRevenue,
      discountAmount,
      lineRevenue,
      lineCost,
      lineProfit,
    };
  }

  private validateDiscountCombination(input: {
    discountType?: DiscountType | null;
    discountValue?: number | null;
  }) {
    if (input.discountType && (input.discountValue === null || input.discountValue === undefined)) {
      throw new BadRequestException(
        'discountValue is required when discountType is provided.',
      );
    }

    if (!input.discountType && input.discountValue !== null && input.discountValue !== undefined) {
      throw new BadRequestException(
        'discountType is required when discountValue is provided.',
      );
    }
  }

  private async generateNextQuoteCode(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SQ-${year}-`;
    const latest = await tx.internalSaleQuote.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });

    const nextNumber = latest
      ? Number(latest.code.slice(prefix.length)) + 1
      : 1;

    return `${prefix}${String(nextNumber).padStart(6, '0')}`;
  }

  private async recalculateQuoteTotalsWithTx(
    tx: Prisma.TransactionClient,
    quoteId: string,
  ) {
    const quote = await tx.internalSaleQuote.findUnique({
      where: { id: quoteId },
      select: {
        id: true,
        discountTotal: true,
        items: {
          select: {
            id: true,
            quantity: true,
            unitSalePrice: true,
            unitCostSnapshot: true,
            discountType: true,
            discountValue: true,
          },
        },
      },
    });

    if (!quote) {
      throw new NotFoundException('Internal sale quote not found.');
    }

    let subtotal = 0;
    let itemsRevenueTotal = 0;
    let totalCost = 0;

    for (const item of quote.items) {
      const financials = this.computeLineFinancials({
        quantity: item.quantity,
        unitSalePrice: this.toNumber(item.unitSalePrice),
        unitCostSnapshot: this.toNumber(item.unitCostSnapshot),
        discountType: item.discountType,
        discountValue: item.discountValue,
      });

      await tx.internalSaleQuoteItem.update({
        where: { id: item.id },
        data: {
          lineRevenue: financials.lineRevenue,
          lineCost: financials.lineCost,
          lineProfit: financials.lineProfit,
        },
      });

      subtotal += financials.grossLineRevenue;
      itemsRevenueTotal += financials.lineRevenue;
      totalCost += financials.lineCost;
    }

    const quoteLevelDiscount = this.toNumber(quote.discountTotal);
    const totalRevenue = Math.max(0, itemsRevenueTotal - quoteLevelDiscount);
    const totalProfit = totalRevenue - totalCost;
    const marginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : null;

    await tx.internalSaleQuote.update({
      where: { id: quoteId },
      data: {
        subtotal,
        totalRevenue,
        totalCost,
        totalProfit,
        marginPct,
      },
    });

    return tx.internalSaleQuote.findUnique({
      where: { id: quoteId },
      select: {
        id: true,
        code: true,
        status: true,
        currency: true,
        subtotal: true,
        discountTotal: true,
        totalRevenue: true,
        totalCost: true,
        totalProfit: true,
        marginPct: true,
        updatedAt: true,
      },
    });
  }

  async recalculateQuoteTotals(quoteId: string) {
    const quoteTotals = await this.prisma.$transaction((tx) =>
      this.recalculateQuoteTotalsWithTx(tx, quoteId),
    );

    return {
      message: 'Quote totals recalculated successfully.',
      data: quoteTotals,
    };
  }

  async createQuote(userId: string, dto: CreateInternalSaleQuoteDto) {
    if (dto.publicQuoteRequestId) {
      const publicQuoteRequest = await this.prisma.quoteRequest.findUnique({
        where: { id: dto.publicQuoteRequestId },
        select: { id: true },
      });

      if (!publicQuoteRequest) {
        throw new BadRequestException('Public quote request not found.');
      }
    }

    let createdQuote:
      | {
          id: string;
          code: string;
          status: InternalSaleQuoteStatus;
          customerName: string;
          customerPhone: string | null;
          customerEmail: string | null;
          customerCity: string | null;
          notes: string | null;
          currency: string;
          subtotal: Prisma.Decimal;
          discountTotal: Prisma.Decimal;
          totalRevenue: Prisma.Decimal;
          totalCost: Prisma.Decimal;
          totalProfit: Prisma.Decimal;
          marginPct: Prisma.Decimal | null;
          publicQuoteRequestId: string | null;
          createdByUserId: string;
          approvedAt: Date | null;
          completedAt: Date | null;
          createdAt: Date;
          updatedAt: Date;
        }
      | null = null;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        createdQuote = await this.prisma.$transaction(async (tx) => {
          const code = await this.generateNextQuoteCode(tx);
          return tx.internalSaleQuote.create({
            data: {
              code,
              status: InternalSaleQuoteStatus.DRAFT,
              customerName: dto.customerName,
              customerPhone: dto.customerPhone,
              customerEmail: dto.customerEmail,
              customerCity: dto.customerCity,
              notes: dto.notes,
              currency: dto.currency ?? 'MXN',
              subtotal: 0,
              discountTotal: 0,
              totalRevenue: 0,
              totalCost: 0,
              totalProfit: 0,
              marginPct: null,
              publicQuoteRequestId: dto.publicQuoteRequestId,
              createdByUserId: userId,
            },
          });
        });

        break;
      } catch (error: unknown) {
        const isUniqueCodeError =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002';
        if (!isUniqueCodeError || attempt === 3) {
          throw error;
        }
      }
    }

    return {
      message: 'Internal sale quote created successfully.',
      data: createdQuote,
    };
  }

  async findAllQuotes(query: FindInternalSaleQuotesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.InternalSaleQuoteWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { customerName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.internalSaleQuote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          code: true,
          status: true,
          customerName: true,
          customerPhone: true,
          customerEmail: true,
          customerCity: true,
          currency: true,
          subtotal: true,
          discountTotal: true,
          totalRevenue: true,
          totalCost: true,
          totalProfit: true,
          marginPct: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              items: true,
            },
          },
        },
      }),
      this.prisma.internalSaleQuote.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneQuote(id: string) {
    const quote = await this.prisma.internalSaleQuote.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        status: true,
        customerName: true,
        customerPhone: true,
        customerEmail: true,
        customerCity: true,
        notes: true,
        currency: true,
        subtotal: true,
        discountTotal: true,
        totalRevenue: true,
        totalCost: true,
        totalProfit: true,
        marginPct: true,
        approvedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        publicQuoteRequest: {
          select: {
            id: true,
            customerName: true,
            status: true,
            createdAt: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        items: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            productId: true,
            variantId: true,
            productNameSnapshot: true,
            productSlugSnapshot: true,
            sizeSnapshot: true,
            colorSnapshot: true,
            skuSnapshot: true,
            quantity: true,
            unitSalePrice: true,
            unitCostSnapshot: true,
            lineRevenue: true,
            lineCost: true,
            lineProfit: true,
            discountType: true,
            discountValue: true,
            sortOrder: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!quote) {
      throw new NotFoundException('Internal sale quote not found.');
    }

    return {
      data: quote,
    };
  }

  async updateQuote(id: string, dto: UpdateInternalSaleQuoteDto) {
    const quote = await this.prisma.internalSaleQuote.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!quote) {
      throw new NotFoundException('Internal sale quote not found.');
    }

    this.assertEditableStatus(quote.status);

    await this.prisma.internalSaleQuote.update({
      where: { id },
      data: {
        ...(dto.customerName !== undefined ? { customerName: dto.customerName } : {}),
        ...(dto.customerPhone !== undefined ? { customerPhone: dto.customerPhone } : {}),
        ...(dto.customerEmail !== undefined ? { customerEmail: dto.customerEmail } : {}),
        ...(dto.customerCity !== undefined ? { customerCity: dto.customerCity } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.discountTotal !== undefined ? { discountTotal: dto.discountTotal } : {}),
      },
    });

    await this.recalculateQuoteTotals(id);
    return this.findOneQuote(id);
  }

  async addQuoteItem(quoteId: string, dto: CreateInternalSaleQuoteItemDto) {
    this.validateDiscountCombination({
      discountType: dto.discountType,
      discountValue: dto.discountValue,
    });

    const quote = await this.prisma.internalSaleQuote.findUnique({
      where: { id: quoteId },
      select: { id: true, status: true },
    });
    if (!quote) {
      throw new NotFoundException('Internal sale quote not found.');
    }
    this.assertEditableStatus(quote.status);

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: {
        id: true,
        name: true,
        slug: true,
        baseCost: true,
      },
    });

    if (!product) {
      throw new BadRequestException('Product not found.');
    }

    let variant:
      | {
          id: string;
          size: string;
          color: string;
          sku: string | null;
          productId: string;
        }
      | null = null;

    if (dto.variantId) {
      variant = await this.prisma.productVariant.findUnique({
        where: { id: dto.variantId },
        select: {
          id: true,
          size: true,
          color: true,
          sku: true,
          productId: true,
        },
      });

      if (!variant) {
        throw new BadRequestException('Variant not found.');
      }
      if (variant.productId !== product.id) {
        throw new BadRequestException('Variant does not belong to the selected product.');
      }
    }

    const unitCostSnapshot =
      dto.unitCostSnapshot ??
      (product.baseCost !== null && product.baseCost !== undefined
        ? this.toNumber(product.baseCost)
        : 0);

    const financials = this.computeLineFinancials({
      quantity: dto.quantity,
      unitSalePrice: dto.unitSalePrice,
      unitCostSnapshot,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
    });

    const createdItem = await this.prisma.internalSaleQuoteItem.create({
      data: {
        quoteId,
        productId: product.id,
        variantId: variant?.id,
        productNameSnapshot: product.name,
        productSlugSnapshot: product.slug,
        sizeSnapshot: variant?.size ?? null,
        colorSnapshot: variant?.color ?? null,
        skuSnapshot: variant?.sku ?? null,
        quantity: dto.quantity,
        unitSalePrice: dto.unitSalePrice,
        unitCostSnapshot,
        lineRevenue: financials.lineRevenue,
        lineCost: financials.lineCost,
        lineProfit: financials.lineProfit,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    const totals = await this.recalculateQuoteTotals(quoteId);

    return {
      message: 'Quote item added successfully.',
      data: {
        item: createdItem,
        quoteTotals: totals.data,
      },
    };
  }

  async updateQuoteItem(
    quoteId: string,
    itemId: string,
    dto: UpdateInternalSaleQuoteItemDto,
  ) {
    const item = await this.prisma.internalSaleQuoteItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        quoteId: true,
        quantity: true,
        unitSalePrice: true,
        unitCostSnapshot: true,
        discountType: true,
        discountValue: true,
        quote: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!item || item.quoteId !== quoteId) {
      throw new NotFoundException('Quote item not found.');
    }

    this.assertEditableStatus(item.quote.status);

    const quantity = dto.quantity ?? item.quantity;
    const unitSalePrice = dto.unitSalePrice ?? this.toNumber(item.unitSalePrice);
    const unitCostSnapshot =
      dto.unitCostSnapshot ?? this.toNumber(item.unitCostSnapshot);
    const discountType = dto.discountType ?? item.discountType;
    const discountValue =
      dto.discountValue !== undefined
        ? dto.discountValue
        : item.discountValue !== null
          ? this.toNumber(item.discountValue)
          : null;

    this.validateDiscountCombination({
      discountType,
      discountValue,
    });

    const financials = this.computeLineFinancials({
      quantity,
      unitSalePrice,
      unitCostSnapshot,
      discountType,
      discountValue,
    });

    const updatedItem = await this.prisma.internalSaleQuoteItem.update({
      where: { id: itemId },
      data: {
        ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
        ...(dto.unitSalePrice !== undefined
          ? { unitSalePrice: dto.unitSalePrice }
          : {}),
        ...(dto.unitCostSnapshot !== undefined
          ? { unitCostSnapshot: dto.unitCostSnapshot }
          : {}),
        ...(dto.discountType !== undefined ? { discountType: dto.discountType } : {}),
        ...(dto.discountValue !== undefined
          ? { discountValue: dto.discountValue }
          : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        lineRevenue: financials.lineRevenue,
        lineCost: financials.lineCost,
        lineProfit: financials.lineProfit,
      },
    });

    const totals = await this.recalculateQuoteTotals(quoteId);

    return {
      message: 'Quote item updated successfully.',
      data: {
        item: updatedItem,
        quoteTotals: totals.data,
      },
    };
  }

  async deleteQuoteItem(quoteId: string, itemId: string) {
    const item = await this.prisma.internalSaleQuoteItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        quoteId: true,
        quote: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!item || item.quoteId !== quoteId) {
      throw new NotFoundException('Quote item not found.');
    }

    this.assertEditableStatus(item.quote.status);

    await this.prisma.internalSaleQuoteItem.delete({
      where: { id: itemId },
    });

    const totals = await this.recalculateQuoteTotals(quoteId);

    return {
      message: 'Quote item deleted successfully.',
      data: {
        id: itemId,
        quoteTotals: totals.data,
      },
    };
  }
}
