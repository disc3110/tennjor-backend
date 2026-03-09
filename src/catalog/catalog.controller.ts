import {
  Controller,
  Get,
  Param,
  Query,
  Body,
  Post,
  Patch,
  UseGuards,
  Delete,
  Res,
  HttpStatus,
  ParseFilePipeBuilder,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
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
import { AdminRoleGuard } from 'src/auth/guards/admin-role.guard';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';

type UploadedImageFile = {
  buffer: Buffer;
  originalname: string;
};

@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('catalog/categories')
  getCategories() {
    return this.catalogService.getCategories();
  }

  @Get('catalog/products')
  getProducts(@Query('category') categorySlug?: string) {
    // GET /catalog/products?category=tenis
    console.log('categorySlug', categorySlug);
    return this.catalogService.getProducts({ categorySlug });
  }

  @Get('catalog/products/:slug')
  getProductBySlug(@Param('slug') slug: string) {
    return this.catalogService.getProductBySlug(slug);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/products')
  createAdminProduct(@Body() createAdminProductDto: CreateAdminProductDto) {
    return this.catalogService.createAdminProduct(createAdminProductDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/products/:id')
  updateAdminProduct(
    @Param('id') id: string,
    @Body() updateAdminProductDto: UpdateAdminProductDto,
  ) {
    return this.catalogService.updateAdminProduct(id, updateAdminProductDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('admin/products/:id')
  deleteAdminProduct(@Param('id') id: string) {
    return this.catalogService.deleteAdminProduct(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/products/:productId/variants')
  createAdminProductVariant(
    @Param('productId') productId: string,
    @Body() createAdminProductVariantDto: CreateAdminProductVariantDto,
  ) {
    return this.catalogService.createAdminProductVariant(
      productId,
      createAdminProductVariantDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/products/:productId/variants/bulk')
  createAdminBulkProductVariants(
    @Param('productId') productId: string,
    @Body()
    createAdminBulkProductVariantsDto: CreateAdminBulkProductVariantsDto,
  ) {
    return this.catalogService.createAdminBulkProductVariants(
      productId,
      createAdminBulkProductVariantsDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/variants/:id')
  updateAdminProductVariant(
    @Param('id') id: string,
    @Body() updateAdminProductVariantDto: UpdateAdminProductVariantDto,
  ) {
    return this.catalogService.updateAdminProductVariant(
      id,
      updateAdminProductVariantDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('admin/variants/:id')
  deleteAdminProductVariant(@Param('id') id: string) {
    return this.catalogService.deleteAdminProductVariant(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/products/:productId/images')
  createAdminProductImage(
    @Param('productId') productId: string,
    @Body() createAdminProductImageDto: CreateAdminProductImageDto,
  ) {
    return this.catalogService.createAdminProductImage(
      productId,
      createAdminProductImageDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/products/:productId/images/upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadAdminProductImage(
    @Param('productId') productId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /^image\/(jpeg|jpg|png|webp|gif|avif)$/,
        })
        .addMaxSizeValidator({ maxSize: 8 * 1024 * 1024 })
        .build({
          errorHttpStatusCode: HttpStatus.BAD_REQUEST,
          fileIsRequired: true,
        }),
    )
    file: UploadedImageFile,
    @Body() uploadAdminProductImageDto: UploadAdminProductImageDto,
  ) {
    return this.catalogService.uploadAdminProductImage(
      productId,
      file,
      uploadAdminProductImageDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/product-images/:id')
  updateAdminProductImage(
    @Param('id') id: string,
    @Body() updateAdminProductImageDto: UpdateAdminProductImageDto,
  ) {
    return this.catalogService.updateAdminProductImage(
      id,
      updateAdminProductImageDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('admin/product-images/:id')
  deleteAdminProductImage(@Param('id') id: string) {
    return this.catalogService.deleteAdminProductImage(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/products')
  findAllAdminProducts(@Query() query: FindAdminProductsDto) {
    return this.catalogService.findAllAdminProducts(query);
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Get('admin/products/export/csv')
  async exportAdminProductsCsv(
    @Query() query: FindAdminProductsDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.catalogService.exportAdminProductsCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
    return csv;
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/products/:id')
  findOneAdminProduct(@Param('id') id: string) {
    return this.catalogService.findOneAdminProduct(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/categories')
  findAllAdminCategories(@Query() query: FindAdminCategoriesDto) {
    return this.catalogService.findAllAdminCategories(query);
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Get('admin/categories/export/csv')
  async exportAdminCategoriesCsv(
    @Query() query: FindAdminCategoriesDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.catalogService.exportAdminCategoriesCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="categories.csv"',
    );
    return csv;
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/categories/:id')
  findOneAdminCategory(@Param('id') id: string) {
    return this.catalogService.findOneAdminCategory(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/categories')
  createAdminCategory(@Body() createAdminCategoryDto: CreateAdminCategoryDto) {
    return this.catalogService.createAdminCategory(createAdminCategoryDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/categories/:id')
  updateAdminCategory(
    @Param('id') id: string,
    @Body() updateAdminCategoryDto: UpdateAdminCategoryDto,
  ) {
    return this.catalogService.updateAdminCategory(id, updateAdminCategoryDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/categories/:id/images/web/upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadAdminCategoryWebImage(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /^image\/(jpeg|jpg|png|webp|gif|avif)$/,
        })
        .addMaxSizeValidator({ maxSize: 8 * 1024 * 1024 })
        .build({
          errorHttpStatusCode: HttpStatus.BAD_REQUEST,
          fileIsRequired: true,
        }),
    )
    file: UploadedImageFile,
  ) {
    return this.catalogService.uploadAdminCategoryWebImage(id, file);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/categories/:id/images/mobile/upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadAdminCategoryMobileImage(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /^image\/(jpeg|jpg|png|webp|gif|avif)$/,
        })
        .addMaxSizeValidator({ maxSize: 8 * 1024 * 1024 })
        .build({
          errorHttpStatusCode: HttpStatus.BAD_REQUEST,
          fileIsRequired: true,
        }),
    )
    file: UploadedImageFile,
  ) {
    return this.catalogService.uploadAdminCategoryMobileImage(id, file);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('admin/categories/:id')
  deleteAdminCategory(@Param('id') id: string) {
    return this.catalogService.deleteAdminCategory(id);
  }
}
