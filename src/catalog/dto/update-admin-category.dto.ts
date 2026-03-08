import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateAdminCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsUrl()
  imageWebUrl?: string;

  @IsOptional()
  @IsUrl()
  imageMobileUrl?: string;
}
