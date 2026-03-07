import {
  Controller,
  Get,
  Param,
  Query,
  Body,
  Post,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateAdminProductDto } from './dto/create-admin-product.dto';
import { UpdateAdminProductDto } from './dto/update-admin-product.dto';
import { CreateAdminProductVariantDto } from './dto/create-admin-product-variant.dto';
import { UpdateAdminProductVariantDto } from './dto/update-admin-product-variant.dto';

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
}
