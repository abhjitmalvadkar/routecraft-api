import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AnswerPromptDto {
  @IsArray()
  @IsNotEmpty()
  conversationHistory: any[];

  @IsNotEmpty()
  answer: any; // string or object depending on inputType

  @IsUUID()
  @IsOptional()
  orgId?: string;
}
