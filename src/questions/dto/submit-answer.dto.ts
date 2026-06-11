import {
  IsArray,
  IsInt,
  IsString,
} from 'class-validator';

export class SubmitAnswersDto {
  @IsArray()
  answers: AnswerDto[];
}

class AnswerDto {
  @IsInt()
  questionId: number;

  @IsString()
  answer: string;
}