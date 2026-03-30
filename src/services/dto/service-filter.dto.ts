import { IsOptional, IsEnum, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceCategory } from '../../entities/enums';

export class ServiceFilterDto {
  @IsOptional()
  @IsEnum(ServiceCategory)
  category?: ServiceCategory;

  @IsOptional()
  @IsUUID()
  destinationId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  timeFilter?: string;
}
