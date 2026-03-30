import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsIn,
} from 'class-validator';

export class SetPricingDto {
  @IsString()
  @IsIn(['percentage', 'custom'])
  markupType: string;

  @IsNumber()
  markupValue: number;

  @IsString()
  @IsIn(['full_package', 'itemized'])
  pricingFormat: string;

  @IsDateString()
  @IsOptional()
  validUntil?: string;
}
