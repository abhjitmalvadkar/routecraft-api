import { IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class CreateOrgDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
