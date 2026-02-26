import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Hace que ConfigService esté disponible en todo el app
      envFilePath: ['.env'],
    }),
  ],
})
export class AppConfigModule {}
