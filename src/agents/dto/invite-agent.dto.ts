import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class InviteAgentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}
