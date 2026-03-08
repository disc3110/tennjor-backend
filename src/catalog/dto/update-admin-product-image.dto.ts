import { IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class UpdateAdminProductImageDto {
  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsUrl()
  secureUrl?: string;

  @IsOptional()
  @IsString()
  publicId?: string;

  @IsOptional()
  @IsString()
  alt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
