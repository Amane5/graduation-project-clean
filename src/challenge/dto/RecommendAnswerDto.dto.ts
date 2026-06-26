import { IsString } from 'class-validator';

export class RecommendAnswerDto {

  @IsString()
  question:string;

}