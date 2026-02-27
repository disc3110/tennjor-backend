import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Category, Product } from '@prisma/client';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getCategories(): Promise<Category[]> {
    return await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
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
}
