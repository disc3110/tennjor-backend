import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Category, Product } from '@prisma/client';
import { CreateAdminProductDto } from './dto/create-admin-product.dto';
import { UpdateAdminProductDto } from './dto/update-admin-product.dto';
import { CreateAdminProductVariantDto } from './dto/create-admin-product-variant.dto';
import { UpdateAdminProductVariantDto } from './dto/update-admin-product-variant.dto';
import { CreateAdminProductImageDto } from './dto/create-admin-product-image.dto';
import { UpdateAdminProductImageDto } from './dto/update-admin-product-image.dto';
import { CreateAdminBulkProductVariantsDto } from './dto/create-admin-bulk-product-variants.dto';
import { UploadAdminProductImageDto } from './dto/upload-admin-product-image.dto';
import { FindAdminProductsDto } from './dto/find-admin-products.dto';
import { FindAdminCategoriesDto } from './dto/find-admin-categories.dto';
import { CreateAdminCategoryDto } from './dto/create-admin-category.dto';
import { UpdateAdminCategoryDto } from './dto/update-admin-category.dto';
import { Prisma } from '@prisma/client';
import { buildCsv } from 'src/common/utils/csv.util';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

type UploadedImageFile = {
  buffer: Buffer;
  originalname: string;
};

type CloudinaryCleanupResult = {
  attempted: boolean;
  result?: string;
  error?: string;
  skippedReason?: string;
};

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private buildAdminProductsWhere(
    query: FindAdminProductsDto,
  ): Prisma.ProductWhereInput {
    return {
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
  }

  private buildAdminCategoriesWhere(
    query: FindAdminCategoriesDto,
  ): Prisma.CategoryWhereInput {
    return {
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
  }

  private formatVariantSize(size: number): string {
    return Number.isInteger(size) ? `${size}` : size.toFixed(1);
  }

  private generateVariantSizes(
    startSize: number,
    endSize: number,
    includeHalfSizes: boolean,
  ): string[] {
    if (startSize > endSize) {
      throw new BadRequestException(
        'Invalid range: startSize must be less than or equal to endSize.',
      );
    }

    const isHalfStepValue = (value: number) => Number.isInteger(value * 2);

    if (!isHalfStepValue(startSize) || !isHalfStepValue(endSize)) {
      throw new BadRequestException(
        'Sizes must use whole or half-size steps (for example: 22, 22.5, 23).',
      );
    }

    if (
      !includeHalfSizes &&
      (!Number.isInteger(startSize) || !Number.isInteger(endSize))
    ) {
      throw new BadRequestException(
        'When includeHalfSizes is false, startSize and endSize must be whole numbers.',
      );
    }

    const start = Math.round(startSize * 2);
    const end = Math.round(endSize * 2);
    const stepInHalves = includeHalfSizes ? 1 : 2;
    const generatedSizes: string[] = [];

    for (let current = start; current <= end; current += stepInHalves) {
      const value = current / 2;
      generatedSizes.push(this.formatVariantSize(value));
    }

    return generatedSizes;
  }

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

  async deleteAdminProduct(id: string) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        images: {
          select: {
            publicId: true,
          },
        },
      },
    });

    if (!existingProduct) {
      throw new NotFoundException('Product not found.');
    }

    const quoteReferences = await this.prisma.quoteRequestItem.count({
      where: { productId: id },
    });

    if (quoteReferences > 0) {
      throw new BadRequestException(
        'Cannot delete product referenced by quote requests.',
      );
    }

    const cloudinaryPublicIds = existingProduct.images
      .map((image) => image.publicId)
      .filter((publicId): publicId is string => Boolean(publicId));

    await this.prisma.$transaction([
      this.prisma.productVariant.deleteMany({
        where: { productId: id },
      }),
      this.prisma.productImage.deleteMany({
        where: { productId: id },
      }),
      this.prisma.product.delete({
        where: { id },
      }),
    ]);

    // TODO(cloudinary): enqueue Cloudinary asset deletion using collected public IDs.
    return {
      message: 'Product deleted successfully.',
      data: {
        id,
        deletedVariants: true,
        deletedImages: true,
        cloudinaryCleanupPendingPublicIds: cloudinaryPublicIds,
      },
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

  async createAdminBulkProductVariants(
    productId: string,
    createAdminBulkProductVariantsDto: CreateAdminBulkProductVariantsDto,
  ) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!existingProduct) {
      throw new NotFoundException('Product not found.');
    }

    const sizesToCreate = this.generateVariantSizes(
      createAdminBulkProductVariantsDto.startSize,
      createAdminBulkProductVariantsDto.endSize,
      createAdminBulkProductVariantsDto.includeHalfSizes,
    );

    const existingVariants = await this.prisma.productVariant.findMany({
      where: {
        productId,
        color: createAdminBulkProductVariantsDto.color,
        size: { in: sizesToCreate },
      },
      select: {
        size: true,
      },
    });

    const existingSizeSet = new Set(
      existingVariants.map((variant) => variant.size),
    );
    const skippedSizes = sizesToCreate.filter((size) =>
      existingSizeSet.has(size),
    );
    const newSizes = sizesToCreate.filter((size) => !existingSizeSet.has(size));

    const createdVariants = await this.prisma.$transaction(
      newSizes.map((size) =>
        this.prisma.productVariant.create({
          data: {
            productId,
            size,
            color: createAdminBulkProductVariantsDto.color,
            isActive: createAdminBulkProductVariantsDto.isActive ?? true,
            stock: createAdminBulkProductVariantsDto.stock,
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
        }),
      ),
    );

    return {
      message: 'Product variants bulk creation completed successfully.',
      data: {
        productId,
        requestedCount: sizesToCreate.length,
        createdCount: createdVariants.length,
        skippedCount: skippedSizes.length,
        skippedSizes,
        variants: createdVariants,
      },
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

  async deleteAdminProductVariant(id: string) {
    const existingVariant = await this.prisma.productVariant.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingVariant) {
      throw new NotFoundException('Product variant not found.');
    }

    await this.prisma.productVariant.delete({
      where: { id },
    });

    return {
      message: 'Product variant deleted successfully.',
      data: {
        id: existingVariant.id,
      },
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

  async uploadAdminProductImage(
    productId: string,
    file: UploadedImageFile,
    uploadAdminProductImageDto: UploadAdminProductImageDto,
  ) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        slug: true,
      },
    });

    if (!existingProduct) {
      throw new NotFoundException('Product not found.');
    }

    const folder = this.cloudinaryService.buildProductFolder(
      existingProduct.slug,
    );

    const uploadedAsset = await this.cloudinaryService.uploadImage({
      fileBuffer: file.buffer,
      filename: file.originalname,
      folder,
    });

    const createdImage = await this.prisma.productImage.create({
      data: {
        productId,
        url: uploadedAsset.url,
        secureUrl: uploadedAsset.secureUrl,
        publicId: uploadedAsset.publicId,
        alt: uploadAdminProductImageDto.alt,
        order: uploadAdminProductImageDto.order ?? 0,
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
      message: 'Product image uploaded successfully.',
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

    let cloudinaryCleanup:
      | {
          attempted: boolean;
          result?: string;
          error?: string;
        }
      | undefined;

    if (existingImage.publicId) {
      try {
        const destroyResult = await this.cloudinaryService.deleteImage(
          existingImage.publicId,
        );
        cloudinaryCleanup = {
          attempted: true,
          result: destroyResult.result,
        };
      } catch (error) {
        this.logger.error(
          `Cloudinary cleanup failed for publicId=${existingImage.publicId}`,
          error instanceof Error ? error.stack : undefined,
        );
        cloudinaryCleanup = {
          attempted: true,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    } else {
      cloudinaryCleanup = {
        attempted: false,
      };
    }

    await this.prisma.productImage.delete({
      where: { id },
    });

    return {
      message: 'Product image deleted successfully.',
      data: {
        id: existingImage.id,
        publicId: existingImage.publicId,
        cloudinaryCleanup,
      },
    };
  }

  async findAllAdminProducts(query: FindAdminProductsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = this.buildAdminProductsWhere(query);

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

  async exportAdminProductsCsv(query: FindAdminProductsDto) {
    const where = this.buildAdminProductsWhere(query);

    const products = await this.prisma.product.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            images: true,
            variants: true,
          },
        },
        variants: {
          select: {
            stock: true,
          },
        },
      },
    });

    const headers = [
      'id',
      'name',
      'slug',
      'description',
      'isActive',
      'categoryId',
      'categoryName',
      'imagesCount',
      'variantsCount',
      'totalStock',
      'createdAt',
      'updatedAt',
    ];

    const rows = products.map((product) => [
      product.id,
      product.name,
      product.slug,
      product.description ?? '',
      product.isActive,
      product.category.id,
      product.category.name,
      product._count.images,
      product._count.variants,
      product.variants.reduce((sum, variant) => sum + (variant.stock ?? 0), 0),
      product.createdAt,
      product.updatedAt,
    ]);

    return buildCsv(headers, rows);
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
    const where = this.buildAdminCategoriesWhere(query);

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

  async exportAdminCategoriesCsv(query: FindAdminCategoriesDto) {
    const where = this.buildAdminCategoriesWhere(query);

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

    const headers = [
      'id',
      'name',
      'slug',
      'isActive',
      'imageWebUrl',
      'imageMobileUrl',
      'productsCount',
      'createdAt',
      'updatedAt',
    ];

    const rows = categories.map((category) => [
      category.id,
      category.name,
      category.slug,
      category.isActive,
      category.imageWebUrl ?? '',
      category.imageMobileUrl ?? '',
      category._count.products,
      category.createdAt,
      category.updatedAt,
    ]);

    return buildCsv(headers, rows);
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

  private async uploadAdminCategoryImage(
    categoryId: string,
    file: UploadedImageFile,
    slot: 'web' | 'mobile',
  ) {
    const existingCategory = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        imageWebUrl: true,
        imageMobileUrl: true,
        imageWebPublicId: true,
        imageMobilePublicId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!existingCategory) {
      throw new NotFoundException('Category not found.');
    }

    const folder = this.cloudinaryService.buildCategoryFolder(
      existingCategory.slug,
    );
    const targetPublicId = this.cloudinaryService.buildCategoryAssetPublicId(
      existingCategory.slug,
      slot,
    );

    const uploadedAsset = await this.cloudinaryService.uploadImage({
      fileBuffer: file.buffer,
      filename: file.originalname,
      folder,
      publicId: targetPublicId,
    });

    const previousPublicId =
      slot === 'web'
        ? existingCategory.imageWebPublicId
        : existingCategory.imageMobilePublicId;

    const updatedCategory = await this.prisma.category.update({
      where: { id: categoryId },
      data:
        slot === 'web'
          ? {
              imageWebUrl: uploadedAsset.secureUrl ?? uploadedAsset.url,
              imageWebPublicId: uploadedAsset.publicId,
            }
          : {
              imageMobileUrl: uploadedAsset.secureUrl ?? uploadedAsset.url,
              imageMobilePublicId: uploadedAsset.publicId,
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
      },
    });

    let previousAssetCleanup: CloudinaryCleanupResult = {
      attempted: false,
    };

    if (previousPublicId && previousPublicId !== uploadedAsset.publicId) {
      try {
        const destroyResult =
          await this.cloudinaryService.deleteImage(previousPublicId);
        previousAssetCleanup = {
          attempted: true,
          result: destroyResult.result,
        };
      } catch (error) {
        this.logger.error(
          `Cloudinary cleanup failed for previous category ${slot} image publicId=${previousPublicId}`,
          error instanceof Error ? error.stack : undefined,
        );
        previousAssetCleanup = {
          attempted: true,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    } else if (previousPublicId && previousPublicId === uploadedAsset.publicId) {
      previousAssetCleanup = {
        attempted: false,
        skippedReason: 'same_public_id_overwritten',
      };
    }

    return {
      message: `Category ${slot} image uploaded successfully.`,
      data: {
        category: updatedCategory,
        uploadedAsset: {
          url: uploadedAsset.url,
          secureUrl: uploadedAsset.secureUrl,
          publicId: uploadedAsset.publicId,
        },
        previousAssetCleanup,
      },
    };
  }

  async uploadAdminCategoryWebImage(categoryId: string, file: UploadedImageFile) {
    return this.uploadAdminCategoryImage(categoryId, file, 'web');
  }

  async uploadAdminCategoryMobileImage(
    categoryId: string,
    file: UploadedImageFile,
  ) {
    return this.uploadAdminCategoryImage(categoryId, file, 'mobile');
  }

  async createAdminCategory(createAdminCategoryDto: CreateAdminCategoryDto) {
    const existingCategory = await this.prisma.category.findUnique({
      where: { slug: createAdminCategoryDto.slug },
      select: { id: true },
    });

    if (existingCategory) {
      throw new BadRequestException('Category slug already exists.');
    }

    const createdCategory = await this.prisma.category.create({
      data: {
        name: createAdminCategoryDto.name,
        slug: createAdminCategoryDto.slug,
        isActive: createAdminCategoryDto.isActive ?? true,
        imageWebUrl: createAdminCategoryDto.imageWebUrl,
        imageMobileUrl: createAdminCategoryDto.imageMobileUrl,
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
      message: 'Category created successfully.',
      data: createdCategory,
    };
  }

  async updateAdminCategory(
    id: string,
    updateAdminCategoryDto: UpdateAdminCategoryDto,
  ) {
    const existingCategory = await this.prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        imageWebUrl: true,
        imageMobileUrl: true,
        imageWebPublicId: true,
        imageMobilePublicId: true,
      },
    });

    if (!existingCategory) {
      throw new NotFoundException('Category not found.');
    }

    if (
      updateAdminCategoryDto.slug &&
      updateAdminCategoryDto.slug !== existingCategory.slug
    ) {
      const categoryWithSameSlug = await this.prisma.category.findUnique({
        where: { slug: updateAdminCategoryDto.slug },
        select: { id: true },
      });

      if (categoryWithSameSlug) {
        throw new BadRequestException('Category slug already exists.');
      }
    }

    const updatedCategory = await this.prisma.category.update({
      where: { id },
      data: {
        ...(updateAdminCategoryDto.name !== undefined
          ? { name: updateAdminCategoryDto.name }
          : {}),
        ...(updateAdminCategoryDto.slug !== undefined
          ? { slug: updateAdminCategoryDto.slug }
          : {}),
        ...(updateAdminCategoryDto.isActive !== undefined
          ? { isActive: updateAdminCategoryDto.isActive }
          : {}),
        ...(updateAdminCategoryDto.imageWebUrl !== undefined
          ? {
              imageWebUrl: updateAdminCategoryDto.imageWebUrl,
              ...(updateAdminCategoryDto.imageWebUrl !==
              existingCategory.imageWebUrl
                ? { imageWebPublicId: null }
                : {}),
            }
          : {}),
        ...(updateAdminCategoryDto.imageMobileUrl !== undefined
          ? {
              imageMobileUrl: updateAdminCategoryDto.imageMobileUrl,
              ...(updateAdminCategoryDto.imageMobileUrl !==
              existingCategory.imageMobileUrl
                ? { imageMobilePublicId: null }
                : {}),
            }
          : {}),
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
      message: 'Category updated successfully.',
      data: updatedCategory,
    };
  }

  async deleteAdminCategory(id: string) {
    const existingCategory = await this.prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        imageWebPublicId: true,
        imageMobilePublicId: true,
        products: {
          select: {
            id: true,
            images: {
              select: {
                publicId: true,
              },
            },
          },
        },
      },
    });

    if (!existingCategory) {
      throw new NotFoundException('Category not found.');
    }

    const productIds = existingCategory.products.map((product) => product.id);
    const cloudinaryPublicIds = [
      ...existingCategory.products.flatMap((product) =>
        product.images
          .map((image) => image.publicId)
          .filter((publicId): publicId is string => Boolean(publicId)),
      ),
      ...[existingCategory.imageWebPublicId, existingCategory.imageMobilePublicId]
        .filter((publicId): publicId is string => Boolean(publicId)),
    ];

    if (productIds.length > 0) {
      const quoteReferences = await this.prisma.quoteRequestItem.count({
        where: {
          productId: { in: productIds },
        },
      });

      if (quoteReferences > 0) {
        throw new BadRequestException(
          'Cannot delete category because one or more products are referenced by quote requests.',
        );
      }
    }

    await this.prisma.$transaction([
      this.prisma.productVariant.deleteMany({
        where: { productId: { in: productIds } },
      }),
      this.prisma.productImage.deleteMany({
        where: { productId: { in: productIds } },
      }),
      this.prisma.product.deleteMany({
        where: { categoryId: id },
      }),
      this.prisma.category.delete({
        where: { id },
      }),
    ]);

    // TODO(cloudinary): enqueue Cloudinary asset deletion using collected public IDs.
    return {
      message: 'Category deleted successfully.',
      data: {
        id,
        deletedProductsCount: productIds.length,
        deletedVariants: true,
        deletedImages: true,
        cloudinaryCleanupPendingPublicIds: cloudinaryPublicIds,
      },
    };
  }
}
