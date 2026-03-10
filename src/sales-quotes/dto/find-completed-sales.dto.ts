import { CompletedSaleStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class FindCompletedSalesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(CompletedSaleStatus)
  status?: CompletedSaleStatus;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  saleNumber?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsIn(['completedAt', 'createdAt', 'totalRevenue', 'totalProfit'])
  sortBy?: 'completedAt' | 'createdAt' | 'totalRevenue' | 'totalProfit' =
    'completedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
