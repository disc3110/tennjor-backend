import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';

@Injectable()
export class QuoteRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createQuoteRequestDto: CreateQuoteRequestDto) {
    const productIds = [
      ...new Set(createQuoteRequestDto.items.map((item) => item.productId)),
    ];

    console.log('Incoming productIds:', productIds);

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

    console.log('Products found:', products);
    console.log('DATABASE_URL:', process.env.DATABASE_URL);

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
}
