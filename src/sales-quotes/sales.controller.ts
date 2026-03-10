import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from 'src/auth/guards/admin-role.guard';
import { SalesQuotesService } from './sales-quotes.service';
import { FindCompletedSalesDto } from './dto/find-completed-sales.dto';
import { GetCompletedSalesStatsDto } from './dto/get-completed-sales-stats.dto';
import type { Response } from 'express';

@Controller('admin/sales')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class SalesController {
  constructor(private readonly salesQuotesService: SalesQuotesService) {}

  @Get()
  findAll(@Query() query: FindCompletedSalesDto) {
    return this.salesQuotesService.findAllCompletedSales(query);
  }

  @Get('stats')
  findStats(@Query() query: GetCompletedSalesStatsDto) {
    return this.salesQuotesService.getCompletedSalesStats(query);
  }

  @Get('export/csv')
  async exportCsv(
    @Query() query: FindCompletedSalesDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.salesQuotesService.exportCompletedSalesCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="sales.csv"');
    return csv;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesQuotesService.findOneCompletedSale(id);
  }
}
