import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateDestinationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;
}
