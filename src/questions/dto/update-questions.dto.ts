import { IsString } from "class-validator";

export class UpdateQuestionDto {
    @IsString()
  question: string;

  @IsString()
  expectedAnswer: string;
}