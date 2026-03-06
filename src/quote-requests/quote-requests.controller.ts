import { Body, Controller, Post } from '@nestjs/common';
import { QuoteRequestsService } from './quote-requests.service';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';

@Controller('quote-requests')
export class QuoteRequestsController {
  constructor(private readonly quoteRequestsService: QuoteRequestsService) {}

  @Post()
  create(@Body() createQuoteRequestDto: CreateQuoteRequestDto) {
    return this.quoteRequestsService.create(createQuoteRequestDto);
  }
}
