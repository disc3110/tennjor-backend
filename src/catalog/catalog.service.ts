import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Category, Product } from '@prisma/client';
import { CreateAdminProductDto } from './dto/create-admin-product.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getCategories(): Promise<Category[]> {
    return await this.prisma.category
      .findMany({
        where: {
          isActive: true,
          products: {
            some: {
              isActive: true,
            },
          },
        },
        include: {
          _count: {
            select: {
              products: {
                where: {
                  isActive: true,
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      })
      .then((categories) =>
        categories
          .filter((category) => category._count.products >= 3)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .map(({ _count, ...category }) => category as Category),
      );
  }

  async getProducts(params?: { categorySlug?: string }): Promise<Product[]> {
    const { categorySlug } = params || {};

    return await this.prisma.product.findMany({
      where: {
        isActive: true,
        category: categorySlug
          ? { slug: categorySlug, isActive: true }
          : undefined,
      },
      include: {
        category: true,
        images: {
          orderBy: { order: 'asc' },
        },
        variants: {
          where: { isActive: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getProductBySlug(slug: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        images: {
          orderBy: { order: 'asc' },
        },
        variants: {
          where: { isActive: true },
        },
      },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async createAdminProduct(createAdminProductDto: CreateAdminProductDto) {
    const existingCategory = await this.prisma.category.findUnique({
      where: { id: createAdminProductDto.categoryId },
      select: { id: true, isActive: true },
    });

    if (!existingCategory) {
      throw new BadRequestException('Category not found.');
    }

    const existingSlug = await this.prisma.product.findUnique({
      where: { slug: createAdminProductDto.slug },
      select: { id: true },
    });

    if (existingSlug) {
      throw new BadRequestException('Product slug already exists.');
    }

    const createdProduct = await this.prisma.product.create({
      data: {
        name: createAdminProductDto.name,
        slug: createAdminProductDto.slug,
        description: createAdminProductDto.description,
        isActive: createAdminProductDto.isActive ?? true,
        categoryId: createAdminProductDto.categoryId,
        images: createAdminProductDto.images?.length
          ? {
              create: createAdminProductDto.images.map((image) => ({
                url: image.url,
                alt: image.alt,
                order: image.order ?? 0,
              })),
            }
          : undefined,
        variants: createAdminProductDto.variants?.length
          ? {
              create: createAdminProductDto.variants.map((variant) => ({
                size: variant.size,
                color: variant.color,
                sku: variant.sku,
                isActive: variant.isActive ?? true,
                stock: variant.stock,
              })),
            }
          : undefined,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          select: {
            id: true,
            url: true,
            alt: true,
            order: true,
          },
        },
        variants: {
          select: {
            id: true,
            size: true,
            color: true,
            sku: true,
            isActive: true,
            stock: true,
          },
        },
      },
    });

    return {
      message: 'Product created successfully.',
      data: createdProduct,
    };
  }
}
