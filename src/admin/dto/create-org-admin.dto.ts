import { IsString, IsNotEmpty, IsEmail, IsUUID } from 'class-validator';

export class CreateOrgAdminDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsUUID()
  orgId: string;
}
