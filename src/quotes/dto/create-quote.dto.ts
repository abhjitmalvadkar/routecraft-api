import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  IsObject,
  IsUUID,
  IsDateString,
} from 'class-validator';

export class CreateQuoteDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  bookingType?: string;

  @IsInt()
  @IsOptional()
  adultsCount?: number;

  @IsInt()
  @IsOptional()
  childrenCount?: number;

  @IsDateString()
  @IsOptional()
  travelStartDate?: string;

  @IsDateString()
  @IsOptional()
  travelEndDate?: string;

  @IsArray()
  @IsOptional()
  destinations?: string[];

  @IsArray()
  itinerary: any[];

  @IsOptional()
  vendorTotal?: number;

  @IsArray()
  @IsOptional()
  aiConversation?: any[];

  @IsUUID()
  @IsOptional()
  orgId?: string;
}
