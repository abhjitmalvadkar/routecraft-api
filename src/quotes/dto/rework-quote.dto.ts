import { IsString, IsNotEmpty } from 'class-validator';

export class ReworkQuoteDto {
  @IsString()
  @IsNotEmpty()
  comment: string;
}
