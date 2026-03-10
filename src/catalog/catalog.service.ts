import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Category } from '@prisma/client';
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
import {
  isHeaderMissing,
  parseCsvWithHeaders,
  type CsvParsedRow,
} from 'src/common/utils/csv-import.util';
import { isURL } from 'class-validator';

type UploadedImageFile = {
  buffer: Buffer;
  originalname: string;
};

type UploadedCsvFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
};

type CsvImportError = {
  row: number;
  reason: string;
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

  private ensureCsvFileExtension(filename: string) {
    if (!filename.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException(
        'Invalid file extension. Please upload a .csv file.',
      );
    }
  }

  private isRowCompletelyEmpty(row: CsvParsedRow): boolean {
    return Object.values(row.values).every((value) => value.trim() === '');
  }

  private parseBooleanCell(
    rawValue: string | undefined,
    columnName: string,
  ): boolean | undefined {
    if (!rawValue || rawValue.trim() === '') {
      return undefined;
    }

    const normalized = rawValue.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'si', 'sí'].includes(normalized)) {
      return true;
    }

    if (['false', '0', 'no', 'n'].includes(normalized)) {
      return false;
    }

    throw new Error(
      `Invalid boolean value for '${columnName}': '${rawValue}'. Use true/false, yes/no, or 1/0.`,
    );
  }

  private parseOptionalUrlCell(
    rawValue: string | undefined,
    columnName: string,
  ): string | null | undefined {
    if (rawValue === undefined) {
      return undefined;
    }

    const normalized = rawValue.trim();
    if (normalized === '') {
      return undefined;
    }

    if (normalized.toLowerCase() === 'null') {
      return null;
    }

    if (!isURL(normalized)) {
      throw new Error(
        `Invalid URL value for '${columnName}': '${rawValue}'. Use an absolute URL or 'null'.`,
      );
    }

    return normalized;
  }

  private parseOptionalTextCell(
    rawValue: string | undefined,
  ): string | null | undefined {
    if (rawValue === undefined) {
      return undefined;
    }

    const normalized = rawValue.trim();
    if (normalized === '') {
      return undefined;
    }

    if (normalized.toLowerCase() === 'null') {
      return null;
    }

    return normalized;
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

  async getProducts(params?: { categorySlug?: string }) {
    const { categorySlug } = params || {};

    return await this.prisma.product.findMany({
      where: {
        isActive: true,
        category: categorySlug
          ? { slug: categorySlug, isActive: true }
          : undefined,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
        categoryId: true,
        createdAt: true,
        updatedAt: true,
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

  async getProductBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
        categoryId: true,
        createdAt: true,
        updatedAt: true,
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
        baseCost: createAdminProductDto.baseCost,
        costCurrency: createAdminProductDto.costCurrency ?? 'MXN',
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
        baseCost: true,
        costCurrency: true,
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
        ...(updateAdminProductDto.baseCost !== undefined
          ? { baseCost: updateAdminProductDto.baseCost }
          : {}),
        ...(updateAdminProductDto.costCurrency !== undefined
          ? { costCurrency: updateAdminProductDto.costCurrency }
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
        baseCost: true,
        costCurrency: true,
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
      select: { id: true },
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
        alt: createAdminProductImageDto.alt,
        order: createAdminProductImageDto.order ?? 0,
      },
      select: {
        id: true,
        url: true,
        alt: true,
        order: true,
        productId: true,
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
        alt: uploadAdminProductImageDto.alt,
        order: uploadAdminProductImageDto.order ?? 0,
      },
      select: {
        id: true,
        url: true,
        alt: true,
        order: true,
        productId: true,
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
        alt: true,
        order: true,
        productId: true,
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
      select: { id: true },
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
          baseCost: true,
          costCurrency: true,
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
        baseCost: true,
        costCurrency: true,
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

  async importAdminCategoriesCsv(file: UploadedCsvFile) {
    this.ensureCsvFileExtension(file.originalname);

    const parsed = parseCsvWithHeaders(file.buffer.toString('utf-8'));
    if (parsed.headers.length === 0) {
      throw new BadRequestException('CSV file is empty.');
    }

    const missingHeaders = isHeaderMissing(parsed.headers, ['name', 'slug']);
    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `Missing required CSV headers: ${missingHeaders.join(', ')}`,
      );
    }

    const errors: CsvImportError[] = [];
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const row of parsed.rows) {
      if (this.isRowCompletelyEmpty(row)) {
        skippedCount += 1;
        continue;
      }

      try {
        const name = (row.values.name ?? '').trim();
        const slug = (row.values.slug ?? '').trim();

        if (!name) {
          throw new Error("Field 'name' is required.");
        }

        if (!slug) {
          throw new Error("Field 'slug' is required.");
        }

        const isActive = this.parseBooleanCell(row.values.isActive, 'isActive');
        const imageWebUrl = this.parseOptionalUrlCell(
          row.values.imageWebUrl,
          'imageWebUrl',
        );
        const imageMobileUrl = this.parseOptionalUrlCell(
          row.values.imageMobileUrl,
          'imageMobileUrl',
        );

        const existingCategory = await this.prisma.category.findUnique({
          where: { slug },
          select: {
            id: true,
            imageWebUrl: true,
            imageMobileUrl: true,
            imageWebPublicId: true,
            imageMobilePublicId: true,
          },
        });

        if (!existingCategory) {
          await this.prisma.category.create({
            data: {
              name,
              slug,
              ...(isActive !== undefined ? { isActive } : {}),
              ...(imageWebUrl !== undefined ? { imageWebUrl } : {}),
              ...(imageMobileUrl !== undefined ? { imageMobileUrl } : {}),
            },
          });
          createdCount += 1;
          continue;
        }

        const updateData: Prisma.CategoryUpdateInput = {
          name,
          ...(isActive !== undefined ? { isActive } : {}),
        };

        if (imageWebUrl !== undefined) {
          updateData.imageWebUrl = imageWebUrl;
          if (imageWebUrl !== existingCategory.imageWebUrl) {
            updateData.imageWebPublicId = null;
          }
        }

        if (imageMobileUrl !== undefined) {
          updateData.imageMobileUrl = imageMobileUrl;
          if (imageMobileUrl !== existingCategory.imageMobileUrl) {
            updateData.imageMobilePublicId = null;
          }
        }

        await this.prisma.category.update({
          where: { id: existingCategory.id },
          data: updateData,
        });
        updatedCount += 1;
      } catch (error) {
        skippedCount += 1;
        errors.push({
          row: row.rowNumber,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      message: 'Categories CSV import completed.',
      data: {
        totalRows: parsed.rows.length,
        createdCount,
        updatedCount,
        skippedCount,
        errors,
      },
    };
  }

  async importAdminProductsCsv(file: UploadedCsvFile) {
    this.ensureCsvFileExtension(file.originalname);

    const parsed = parseCsvWithHeaders(file.buffer.toString('utf-8'));
    if (parsed.headers.length === 0) {
      throw new BadRequestException('CSV file is empty.');
    }

    const missingHeaders = isHeaderMissing(parsed.headers, ['name', 'slug']);
    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `Missing required CSV headers: ${missingHeaders.join(', ')}`,
      );
    }

    if (
      !parsed.headers.includes('categoryId') &&
      !parsed.headers.includes('categorySlug')
    ) {
      throw new BadRequestException(
        "CSV must include at least one category reference column: 'categoryId' or 'categorySlug'.",
      );
    }

    const errors: CsvImportError[] = [];
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const categoryIds = new Set<string>();
    const categorySlugs = new Set<string>();
    const productSlugs = new Set<string>();

    for (const row of parsed.rows) {
      const categoryId = (row.values.categoryId ?? '').trim();
      const categorySlug = (row.values.categorySlug ?? '').trim();
      const productSlug = (row.values.slug ?? '').trim();

      if (categoryId) {
        categoryIds.add(categoryId);
      }
      if (categorySlug) {
        categorySlugs.add(categorySlug);
      }
      if (productSlug) {
        productSlugs.add(productSlug);
      }
    }

    const categoryWhereClauses: Prisma.CategoryWhereInput[] = [];
    if (categoryIds.size > 0) {
      categoryWhereClauses.push({ id: { in: Array.from(categoryIds) } });
    }
    if (categorySlugs.size > 0) {
      categoryWhereClauses.push({ slug: { in: Array.from(categorySlugs) } });
    }

    const categories = await this.prisma.category.findMany({
      where:
        categoryWhereClauses.length > 0
          ? {
              OR: categoryWhereClauses,
            }
          : undefined,
      select: {
        id: true,
        slug: true,
      },
    });

    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const categoryBySlug = new Map(
      categories.map((category) => [category.slug, category]),
    );

    const existingProducts = await this.prisma.product.findMany({
      where: {
        slug: {
          in: Array.from(productSlugs),
        },
      },
      select: {
        id: true,
        slug: true,
      },
    });
    const productBySlug = new Map(
      existingProducts.map((product) => [product.slug, product]),
    );

    for (const row of parsed.rows) {
      if (this.isRowCompletelyEmpty(row)) {
        skippedCount += 1;
        continue;
      }

      try {
        const name = (row.values.name ?? '').trim();
        const slug = (row.values.slug ?? '').trim();
        const description = this.parseOptionalTextCell(row.values.description);
        const isActive = this.parseBooleanCell(row.values.isActive, 'isActive');
        const categoryIdInput = (row.values.categoryId ?? '').trim();
        const categorySlugInput = (row.values.categorySlug ?? '').trim();

        if (!name) {
          throw new Error("Field 'name' is required.");
        }

        if (!slug) {
          throw new Error("Field 'slug' is required.");
        }

        if (!categoryIdInput && !categorySlugInput) {
          throw new Error(
            "One category reference is required: 'categoryId' or 'categorySlug'.",
          );
        }

        const categoryFromId = categoryIdInput
          ? categoryById.get(categoryIdInput)
          : undefined;
        const categoryFromSlug = categorySlugInput
          ? categoryBySlug.get(categorySlugInput)
          : undefined;

        if (categoryIdInput && !categoryFromId) {
          throw new Error(
            `Category not found for categoryId='${categoryIdInput}'.`,
          );
        }

        if (categorySlugInput && !categoryFromSlug) {
          throw new Error(
            `Category not found for categorySlug='${categorySlugInput}'.`,
          );
        }

        if (
          categoryFromId &&
          categoryFromSlug &&
          categoryFromId.id !== categoryFromSlug.id
        ) {
          throw new Error(
            `categoryId='${categoryIdInput}' and categorySlug='${categorySlugInput}' reference different categories.`,
          );
        }

        const resolvedCategoryId =
          categoryFromId?.id ?? categoryFromSlug?.id ?? null;

        if (!resolvedCategoryId) {
          throw new Error('Unable to resolve category reference for this row.');
        }

        const existingProduct = productBySlug.get(slug);
        if (!existingProduct) {
          const created = await this.prisma.product.create({
            data: {
              name,
              slug,
              categoryId: resolvedCategoryId,
              ...(description !== undefined ? { description } : {}),
              ...(isActive !== undefined ? { isActive } : {}),
            },
            select: {
              id: true,
              slug: true,
            },
          });

          productBySlug.set(created.slug, created);
          createdCount += 1;
          continue;
        }

        const updateData: Prisma.ProductUpdateInput = {
          name,
          category: { connect: { id: resolvedCategoryId } },
          ...(description !== undefined ? { description } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        };

        await this.prisma.product.update({
          where: { id: existingProduct.id },
          data: updateData,
        });
        updatedCount += 1;
      } catch (error) {
        skippedCount += 1;
        errors.push({
          row: row.rowNumber,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      message: 'Products CSV import completed.',
      data: {
        totalRows: parsed.rows.length,
        createdCount,
        updatedCount,
        skippedCount,
        errors,
      },
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
          },
        },
      },
    });

    if (!existingCategory) {
      throw new NotFoundException('Category not found.');
    }

    const productIds = existingCategory.products.map((product) => product.id);
    const cloudinaryPublicIds = [
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
