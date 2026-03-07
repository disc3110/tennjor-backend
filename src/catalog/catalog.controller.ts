import {
  Controller,
  Get,
  Param,
  Query,
  Body,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateAdminProductDto } from './dto/create-admin-product.dto';

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
}
