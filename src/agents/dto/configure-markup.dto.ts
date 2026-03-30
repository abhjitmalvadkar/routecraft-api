import { IsArray, ValidateNested, IsNumber, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class MarkupOptionDto {
  @IsNumber()
  @Min(0)
  percentage: number;

  @IsBoolean()
  flagged: boolean;
}

export class ConfigureMarkupDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MarkupOptionDto)
  options: MarkupOptionDto[];
}
