import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from 'src/auth/guards/admin-role.guard';
import type { Response } from 'express';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard)
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('stats')
  getStats() {
    return this.adminDashboardService.getStats();
  }

  @UseGuards(AdminRoleGuard)
  @Get('stats/export/csv')
  async exportStatsCsv(@Res({ passthrough: true }) res: Response) {
    const csv = await this.adminDashboardService.exportStatsCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="dashboard-stats.csv"',
    );
    return csv;
  }
}
