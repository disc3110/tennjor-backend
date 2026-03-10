import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Query,
  UseGuards,
  Patch,
  Req,
} from '@nestjs/common';
import { QuoteRequestsService } from './quote-requests.service';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import { FindAdminQuoteRequestsDto } from './dto/find-admin-quote-requests.dto';
import { UpdateQuoteRequestStatusDto } from './dto/update-quote-request-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from 'src/auth/guards/admin-role.guard';

type AuthenticatedRequest = {
  user: {
    id: string;
    role: string;
  };
};

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

  @UseGuards(JwtAuthGuard)
  @Patch('admin/quote-requests/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateQuoteRequestStatusDto: UpdateQuoteRequestStatusDto,
  ) {
    return this.quoteRequestsService.updateStatus(
      id,
      updateQuoteRequestStatusDto,
    );
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Post('admin/quote-requests/:id/convert-to-sales-quote')
  convertToSalesQuote(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.quoteRequestsService.convertToSalesQuote(id, req.user.id);
  }
}
