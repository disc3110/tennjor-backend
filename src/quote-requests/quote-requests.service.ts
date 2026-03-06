import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import { FindAdminQuoteRequestsDto } from './dto/find-admin-quote-requests.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class QuoteRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createQuoteRequestDto: CreateQuoteRequestDto) {
    const productIds = [
      ...new Set(createQuoteRequestDto.items.map((item) => item.productId)),
    ];

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products are invalid.');
    }

    const productsMap = new Map(
      products.map((product) => [product.id, product]),
    );

    const createdQuoteRequest = await this.prisma.quoteRequest.create({
      data: {
        customerName: createQuoteRequestDto.customerName,
        customerEmail: createQuoteRequestDto.customerEmail,
        customerPhone: createQuoteRequestDto.customerPhone,
        customerCity: createQuoteRequestDto.customerCity,
        notes: createQuoteRequestDto.notes,
        source: 'WEB_FORM',
        items: {
          create: createQuoteRequestDto.items.map((item) => {
            const product = productsMap.get(item.productId);

            if (!product) {
              throw new BadRequestException(
                `Product not found for id ${item.productId}`,
              );
            }

            return {
              productId: item.productId,
              productNameSnapshot: product.name,
              productSlugSnapshot: product.slug,
              size: item.size,
              color: item.color,
              quantity: item.quantity ?? 1,
            };
          }),
        },
      },
      include: {
        items: true,
      },
    });

    return {
      message: 'Quote request created successfully.',
      data: createdQuoteRequest,
    };
  }

  async findAllAdmin(query: FindAdminQuoteRequestsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.QuoteRequestWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              {
                customerName: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                customerEmail: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                customerPhone: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.quoteRequest.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
        include: {
          items: {
            select: {
              id: true,
              productId: true,
              productNameSnapshot: true,
              productSlugSnapshot: true,
              size: true,
              color: true,
              quantity: true,
            },
          },
        },
      }),
      this.prisma.quoteRequest.count({ where }),
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

  async findOneAdmin(id: string) {
    const quoteRequest = await this.prisma.quoteRequest.findUnique({
      where: { id },
      include: {
        items: {
          select: {
            id: true,
            productId: true,
            productNameSnapshot: true,
            productSlugSnapshot: true,
            size: true,
            color: true,
            quantity: true,
            createdAt: true,
          },
        },
      },
    });

    if (!quoteRequest) {
      throw new NotFoundException('Quote request not found.');
    }

    return {
      data: quoteRequest,
    };
  }
}
