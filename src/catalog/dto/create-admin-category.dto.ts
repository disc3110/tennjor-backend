import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateAdminCategoryDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

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
