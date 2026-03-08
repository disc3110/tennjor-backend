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
import { CreateAdminProductImageDto } from './dto/create-admin-product-image.dto';
import { UpdateAdminProductImageDto } from './dto/update-admin-product-image.dto';
import { FindAdminProductsDto } from './dto/find-admin-products.dto';
import { FindAdminCategoriesDto } from './dto/find-admin-categories.dto';
import { Prisma } from '@prisma/client';

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

  async createAdminProductImage(
    productId: string,
    createAdminProductImageDto: CreateAdminProductImageDto,
  ) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!existingProduct) {
      throw new NotFoundException('Product not found.');
    }

    const createdImage = await this.prisma.productImage.create({
      data: {
        productId,
        url: createAdminProductImageDto.url,
        secureUrl: createAdminProductImageDto.secureUrl,
        publicId: createAdminProductImageDto.publicId,
        alt: createAdminProductImageDto.alt,
        order: createAdminProductImageDto.order ?? 0,
      },
      select: {
        id: true,
        url: true,
        secureUrl: true,
        publicId: true,
        alt: true,
        order: true,
        productId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      message: 'Product image created successfully.',
      data: createdImage,
    };
  }

  async updateAdminProductImage(
    id: string,
    updateAdminProductImageDto: UpdateAdminProductImageDto,
  ) {
    const existingImage = await this.prisma.productImage.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingImage) {
      throw new NotFoundException('Product image not found.');
    }

    const updatedImage = await this.prisma.productImage.update({
      where: { id },
      data: {
        ...(updateAdminProductImageDto.url !== undefined
          ? { url: updateAdminProductImageDto.url }
          : {}),
        ...(updateAdminProductImageDto.secureUrl !== undefined
          ? { secureUrl: updateAdminProductImageDto.secureUrl }
          : {}),
        ...(updateAdminProductImageDto.publicId !== undefined
          ? { publicId: updateAdminProductImageDto.publicId }
          : {}),
        ...(updateAdminProductImageDto.alt !== undefined
          ? { alt: updateAdminProductImageDto.alt }
          : {}),
        ...(updateAdminProductImageDto.order !== undefined
          ? { order: updateAdminProductImageDto.order }
          : {}),
      },
      select: {
        id: true,
        url: true,
        secureUrl: true,
        publicId: true,
        alt: true,
        order: true,
        productId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      message: 'Product image updated successfully.',
      data: updatedImage,
    };
  }

  async deleteAdminProductImage(id: string) {
    const existingImage = await this.prisma.productImage.findUnique({
      where: { id },
      select: { id: true, publicId: true },
    });

    if (!existingImage) {
      throw new NotFoundException('Product image not found.');
    }

    await this.prisma.productImage.delete({
      where: { id },
    });

    return {
      message: 'Product image deleted successfully.',
      data: {
        id: existingImage.id,
        publicId: existingImage.publicId,
      },
    };
  }

  async findAllAdminProducts(query: FindAdminProductsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      ...(query.search
        ? {
            OR: [
              {
                name: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                slug: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
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
            orderBy: {
              order: 'asc',
            },
            select: {
              id: true,
              url: true,
              secureUrl: true,
              publicId: true,
              alt: true,
              order: true,
            },
          },
          variants: {
            orderBy: {
              size: 'asc',
            },
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
      }),
      this.prisma.product.count({ where }),
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

  async findOneAdminProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
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
          orderBy: {
            order: 'asc',
          },
          select: {
            id: true,
            url: true,
            secureUrl: true,
            publicId: true,
            alt: true,
            order: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        variants: {
          orderBy: {
            size: 'asc',
          },
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

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    return {
      data: product,
    };
  }

  async findAllAdminCategories(query: FindAdminCategoriesDto) {
    const where: Prisma.CategoryWhereInput = {
      ...(query.search
        ? {
            OR: [
              {
                name: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                slug: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    };

    const categories = await this.prisma.category.findMany({
      where,
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        imageWebUrl: true,
        imageMobileUrl: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    return {
      data: categories,
    };
  }

  async findOneAdminCategory(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        imageWebUrl: true,
        imageMobileUrl: true,
        createdAt: true,
        updatedAt: true,
        products: {
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            createdAt: true,
            images: {
              orderBy: {
                order: 'asc',
              },
              take: 1,
              select: {
                id: true,
                url: true,
                secureUrl: true,
                alt: true,
                order: true,
              },
            },
            variants: {
              select: {
                id: true,
                size: true,
                color: true,
                stock: true,
                isActive: true,
              },
            },
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    return {
      data: category,
    };
  }
}
