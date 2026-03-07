import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard)
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('stats')
  getStats() {
    return this.adminDashboardService.getStats();
  }
}
