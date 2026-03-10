import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateQuoteRequestItemDto {
  @IsString()
  productId: string;

  @IsString()
  size: string;

  @IsString()
  color: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
