import { IsInt, IsOptional, IsString } from 'class-validator';

export class AskQuestionDto {
  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsInt()
  conversationId?: number;
}
