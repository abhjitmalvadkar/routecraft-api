import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsObject,
  IsUUID,
} from 'class-validator';
import { ServiceCategory } from '../../entities/enums';

export class UpdateServiceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ServiceCategory)
  @IsOptional()
  category?: ServiceCategory;

  @IsUUID()
  @IsOptional()
  destinationId?: string;

  @IsNumber()
  @IsOptional()
  vendorRate?: number;

  @IsObject()
  @IsOptional()
  metadata?: any;
}
