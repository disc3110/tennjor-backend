import { Module } from '@nestjs/common';
import { QuoteRequestsService } from './quote-requests.service';
import { QuoteRequestsController } from './quote-requests.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SalesQuotesModule } from 'src/sales-quotes/sales-quotes.module';
import { AdminRoleGuard } from 'src/auth/guards/admin-role.guard';

@Module({
  imports: [PrismaModule, SalesQuotesModule],
  providers: [QuoteRequestsService, AdminRoleGuard],
  controllers: [QuoteRequestsController],
})
export class QuoteRequestsModule {}
