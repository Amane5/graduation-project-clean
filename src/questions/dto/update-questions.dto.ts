import { IsOptional, IsString } from "class-validator";

export class UpdateQuestionDto {
    @IsString()
  question: string;


}