import { IsString, IsNotEmpty, IsEmail, IsEnum } from 'class-validator';
import { Role } from '../../entities/enums';

export class InviteUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(Role, { message: 'Role must be ORG_ADMIN or AGENT' })
  role: Role;
}
