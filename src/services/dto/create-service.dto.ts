import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsObject,
  IsUUID,
} from 'class-validator';
import { ServiceCategory } from '../../entities/enums';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(ServiceCategory)
  category: ServiceCategory;

  @IsUUID()
  destinationId: string;

  @IsNumber()
  vendorRate: number;

  @IsObject()
  @IsOptional()
  metadata?: any;
}
