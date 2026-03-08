import { Module } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';
import { AdminRoleGuard } from 'src/auth/guards/admin-role.guard';

@Module({
  providers: [CatalogService, AdminRoleGuard],
  controllers: [CatalogController],
})
export class CatalogModule {}
