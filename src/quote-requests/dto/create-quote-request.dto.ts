import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateQuoteRequestItemDto } from './create-quote-request-item.dto';

export class CreateQuoteRequestDto {
  @IsString()
  customerName: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsString()
  customerPhone: string;

  @IsOptional()
  @IsString()
  customerCity?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteRequestItemDto)
  items: CreateQuoteRequestItemDto[];
}
