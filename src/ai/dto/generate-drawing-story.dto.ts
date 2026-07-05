import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString } from "class-validator";

export class GenerateDrawingStoryDto {

  @Type(() => Number)
  @IsInt()
  conversationId: number;

  // @IsInt()
  // childId: number;

}