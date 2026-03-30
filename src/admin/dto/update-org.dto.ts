import { IsString, IsOptional } from 'class-validator';

export class UpdateOrgDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
