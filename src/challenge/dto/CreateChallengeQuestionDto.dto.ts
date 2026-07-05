import {
  IsInt,
  IsString,
  Min,
} from 'class-validator';

export class CreateChallengeQuestionDto {
  @IsString()
  question: string;

  @IsString()
  expectedAnswer: string;

  @IsInt()
  @Min(1)
  points: number;
}