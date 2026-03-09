import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateAdminProductImageDto } from './create-admin-product-image.dto';
import { CreateAdminProductVariantDto } from './create-admin-product-variant.dto';

export class CreateAdminProductDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  baseCost?: number;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  costCurrency?: string;

  @IsString()
  categoryId: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAdminProductImageDto)
  images?: CreateAdminProductImageDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAdminProductVariantDto)
  variants?: CreateAdminProductVariantDto[];
}
