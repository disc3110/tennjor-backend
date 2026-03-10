import { Module } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AdminRoleGuard } from 'src/auth/guards/admin-role.guard';

@Module({
  imports: [PrismaModule],
  providers: [AdminDashboardService, AdminRoleGuard],
  controllers: [AdminDashboardController],
})
export class AdminDashboardModule {}
