import { IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreateAdminProductImageDto {
  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  alt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
