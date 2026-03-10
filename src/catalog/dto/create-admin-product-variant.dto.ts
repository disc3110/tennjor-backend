import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateAdminProductVariantDto {
  @IsString()
  size: string;

  @IsString()
  color: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;
}
