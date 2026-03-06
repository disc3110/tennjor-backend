import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { QuoteRequestsService } from './quote-requests.service';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import { FindAdminQuoteRequestsDto } from './dto/find-admin-quote-requests.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller()
export class QuoteRequestsController {
  constructor(private readonly quoteRequestsService: QuoteRequestsService) {}

  @Post('quote-requests')
  create(@Body() createQuoteRequestDto: CreateQuoteRequestDto) {
    return this.quoteRequestsService.create(createQuoteRequestDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/quote-requests')
  findAllAdmin(@Query() query: FindAdminQuoteRequestsDto) {
    return this.quoteRequestsService.findAllAdmin(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/quote-requests/:id')
  findOneAdmin(@Param('id') id: string) {
    return this.quoteRequestsService.findOneAdmin(id);
  }
}
