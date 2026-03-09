import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from 'src/auth/guards/admin-role.guard';
import { SalesQuotesService } from './sales-quotes.service';
import { CreateInternalSaleQuoteDto } from './dto/create-internal-sale-quote.dto';
import { FindInternalSaleQuotesDto } from './dto/find-internal-sale-quotes.dto';
import { UpdateInternalSaleQuoteDto } from './dto/update-internal-sale-quote.dto';
import { CreateInternalSaleQuoteItemDto } from './dto/create-internal-sale-quote-item.dto';
import { UpdateInternalSaleQuoteItemDto } from './dto/update-internal-sale-quote-item.dto';

type AuthenticatedRequest = {
  user: {
    id: string;
    role: string;
  };
};

@Controller('admin/sales-quotes')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class SalesQuotesController {
  constructor(private readonly salesQuotesService: SalesQuotesService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateInternalSaleQuoteDto) {
    return this.salesQuotesService.createQuote(req.user.id, dto);
  }

  @Get()
  findAll(@Query() query: FindInternalSaleQuotesDto) {
    return this.salesQuotesService.findAllQuotes(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesQuotesService.findOneQuote(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInternalSaleQuoteDto) {
    return this.salesQuotesService.updateQuote(id, dto);
  }

  @Post(':id/items')
  addItem(
    @Param('id') id: string,
    @Body() dto: CreateInternalSaleQuoteItemDto,
  ) {
    return this.salesQuotesService.addQuoteItem(id, dto);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateInternalSaleQuoteItemDto,
  ) {
    return this.salesQuotesService.updateQuoteItem(id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  deleteItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.salesQuotesService.deleteQuoteItem(id, itemId);
  }

  @Post(':id/recalculate')
  recalculate(@Param('id') id: string) {
    return this.salesQuotesService.recalculateQuoteTotals(id);
  }
}
