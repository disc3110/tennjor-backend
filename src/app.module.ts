import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { CatalogModule } from './catalog/catalog.module';
import { QuoteRequestsModule } from './quote-requests/quote-requests.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    UsersModule,
    CatalogModule,
    QuoteRequestsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
