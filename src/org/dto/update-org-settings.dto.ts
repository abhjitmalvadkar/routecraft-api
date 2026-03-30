import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class UpdateOrgSettingsDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsInt()
  @Min(1)
  @Max(7)
  @IsOptional()
  defaultQuoteValidity?: number;
}
