import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class StartConversationDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsUUID()
  @IsOptional()
  orgId?: string;
}
