import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { CatalogModule } from './catalog/catalog.module';

@Module({
  imports: [AppConfigModule, PrismaModule, UsersModule, CatalogModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
