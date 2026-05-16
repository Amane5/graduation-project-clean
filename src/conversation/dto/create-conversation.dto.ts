import { IsOptional, IsString } from 'class-validator';

export class CreateConversationDto {
@IsString()
@IsOptional()
question?: string;

  @IsString()
  @IsOptional()
  title?: string;
}
