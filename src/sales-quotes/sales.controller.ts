import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from 'src/auth/guards/admin-role.guard';
import { SalesQuotesService } from './sales-quotes.service';
import { FindCompletedSalesDto } from './dto/find-completed-sales.dto';

@Controller('admin/sales')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class SalesController {
  constructor(private readonly salesQuotesService: SalesQuotesService) {}

  @Get()
  findAll(@Query() query: FindCompletedSalesDto) {
    return this.salesQuotesService.findAllCompletedSales(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesQuotesService.findOneCompletedSale(id);
  }
}
