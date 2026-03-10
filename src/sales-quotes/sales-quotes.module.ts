import { Module } from '@nestjs/common';
import { SalesQuotesController } from './sales-quotes.controller';
import { SalesQuotesService } from './sales-quotes.service';
import { AdminRoleGuard } from 'src/auth/guards/admin-role.guard';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SalesController } from './sales.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SalesQuotesController, SalesController],
  providers: [SalesQuotesService, AdminRoleGuard],
  exports: [SalesQuotesService],
})
export class SalesQuotesModule {}
