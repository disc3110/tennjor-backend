import { CompletedSaleStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export enum SalesStatsPeriod {
  MONTH = 'month',
  YEAR = 'year',
  CUSTOM = 'custom',
}

export class GetCompletedSalesStatsDto {
  @IsOptional()
  @IsEnum(SalesStatsPeriod)
  period?: SalesStatsPeriod = SalesStatsPeriod.MONTH;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(9999)
  year?: number;

  @ValidateIf(
    (o: GetCompletedSalesStatsDto) => o.period === SalesStatsPeriod.MONTH,
  )
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ValidateIf(
    (o: GetCompletedSalesStatsDto) => o.period === SalesStatsPeriod.CUSTOM,
  )
  @IsDateString()
  dateFrom?: string;

  @ValidateIf(
    (o: GetCompletedSalesStatsDto) => o.period === SalesStatsPeriod.CUSTOM,
  )
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsEnum(CompletedSaleStatus)
  status?: CompletedSaleStatus;
}
