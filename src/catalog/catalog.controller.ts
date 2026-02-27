import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  getCategories() {
    return this.catalogService.getCategories();
  }

  @Get('products')
  getProducts(@Query('category') categorySlug?: string) {
    // GET /catalog/products?category=tenis
    console.log('categorySlug', categorySlug);
    return this.catalogService.getProducts({ categorySlug });
  }

  @Get('products/:slug')
  getProductBySlug(@Param('slug') slug: string) {
    return this.catalogService.getProductBySlug(slug);
  }
}
