import { IsString, IsOptional } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  // Note: email is NOT included — email is immutable
}
