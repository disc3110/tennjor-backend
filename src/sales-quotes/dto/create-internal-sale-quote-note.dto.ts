import { IsString, Matches, MaxLength } from 'class-validator';

export class CreateInternalSaleQuoteNoteDto {
  @IsString()
  @Matches(/\S/, { message: 'message must not be empty.' })
  @MaxLength(2000)
  message: string;
}
