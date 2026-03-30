import { IsEmail, IsOptional, IsString } from 'class-validator';

export class SendQuoteDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  personalNote?: string;
}
