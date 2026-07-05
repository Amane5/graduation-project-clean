import { IsInt, IsOptional, IsString } from "class-validator";

export class SendDrawingMessageDto {

  @IsInt()
  conversationId: number;

  @IsOptional()
  @IsString()
  message?: string;

}