import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Category, Product } from '@prisma/client';
import { CreateAdminProductDto } from './dto/create-admin-product.dto';
import { UpdateAdminProductDto } from './dto/update-admin-product.dto';
import { CreateAdminProductVariantDto } from './dto/create-admin-product-variant.dto';
import { UpdateAdminProductVariantDto } from './dto/update-admin-product-variant.dto';

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

  async updateAdminProduct(
    id: string,
    updateAdminProductDto: UpdateAdminProductDto,
  ) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        categoryId: true,
      },
    });

    if (!existingProduct) {
      throw new NotFoundException('Product not found.');
    }

    if (updateAdminProductDto.categoryId) {
      const existingCategory = await this.prisma.category.findUnique({
        where: { id: updateAdminProductDto.categoryId },
        select: { id: true },
      });

      if (!existingCategory) {
        throw new BadRequestException('Category not found.');
      }
    }

    if (
      updateAdminProductDto.slug &&
      updateAdminProductDto.slug !== existingProduct.slug
    ) {
      const productWithSameSlug = await this.prisma.product.findUnique({
        where: { slug: updateAdminProductDto.slug },
        select: { id: true },
      });

      if (productWithSameSlug) {
        throw new BadRequestException('Product slug already exists.');
      }
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        ...(updateAdminProductDto.name !== undefined
          ? { name: updateAdminProductDto.name }
          : {}),
        ...(updateAdminProductDto.slug !== undefined
          ? { slug: updateAdminProductDto.slug }
          : {}),
        ...(updateAdminProductDto.description !== undefined
          ? { description: updateAdminProductDto.description }
          : {}),
        ...(updateAdminProductDto.isActive !== undefined
          ? { isActive: updateAdminProductDto.isActive }
          : {}),
        ...(updateAdminProductDto.categoryId !== undefined
          ? { categoryId: updateAdminProductDto.categoryId }
          : {}),
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
      message: 'Product updated successfully.',
      data: updatedProduct,
    };
  }

  async createAdminProductVariant(
    productId: string,
    createAdminProductVariantDto: CreateAdminProductVariantDto,
  ) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!existingProduct) {
      throw new NotFoundException('Product not found.');
    }

    if (createAdminProductVariantDto.sku) {
      const existingSku = await this.prisma.productVariant.findUnique({
        where: { sku: createAdminProductVariantDto.sku },
        select: { id: true },
      });

      if (existingSku) {
        throw new BadRequestException('Variant SKU already exists.');
      }
    }

    const createdVariant = await this.prisma.productVariant.create({
      data: {
        productId,
        size: createAdminProductVariantDto.size,
        color: createAdminProductVariantDto.color,
        sku: createAdminProductVariantDto.sku,
        isActive: createAdminProductVariantDto.isActive ?? true,
        stock: createAdminProductVariantDto.stock,
      },
      select: {
        id: true,
        size: true,
        color: true,
        sku: true,
        isActive: true,
        stock: true,
        productId: true,
      },
    });

    return {
      message: 'Product variant created successfully.',
      data: createdVariant,
    };
  }

  async updateAdminProductVariant(
    id: string,
    updateAdminProductVariantDto: UpdateAdminProductVariantDto,
  ) {
    const existingVariant = await this.prisma.productVariant.findUnique({
      where: { id },
      select: {
        id: true,
        sku: true,
        productId: true,
      },
    });

    if (!existingVariant) {
      throw new NotFoundException('Product variant not found.');
    }

    if (
      updateAdminProductVariantDto.sku &&
      updateAdminProductVariantDto.sku !== existingVariant.sku
    ) {
      const variantWithSameSku = await this.prisma.productVariant.findUnique({
        where: { sku: updateAdminProductVariantDto.sku },
        select: { id: true },
      });

      if (variantWithSameSku) {
        throw new BadRequestException('Variant SKU already exists.');
      }
    }

    const updatedVariant = await this.prisma.productVariant.update({
      where: { id },
      data: {
        ...(updateAdminProductVariantDto.size !== undefined
          ? { size: updateAdminProductVariantDto.size }
          : {}),
        ...(updateAdminProductVariantDto.color !== undefined
          ? { color: updateAdminProductVariantDto.color }
          : {}),
        ...(updateAdminProductVariantDto.sku !== undefined
          ? { sku: updateAdminProductVariantDto.sku }
          : {}),
        ...(updateAdminProductVariantDto.isActive !== undefined
          ? { isActive: updateAdminProductVariantDto.isActive }
          : {}),
        ...(updateAdminProductVariantDto.stock !== undefined
          ? { stock: updateAdminProductVariantDto.stock }
          : {}),
      },
      select: {
        id: true,
        size: true,
        color: true,
        sku: true,
        isActive: true,
        stock: true,
        productId: true,
      },
    });

    return {
      message: 'Product variant updated successfully.',
      data: updatedVariant,
    };
  }
}
