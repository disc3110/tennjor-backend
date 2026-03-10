import { QuoteRequestStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateQuoteRequestStatusDto {
  @IsEnum(QuoteRequestStatus)
  status: QuoteRequestStatus;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}
