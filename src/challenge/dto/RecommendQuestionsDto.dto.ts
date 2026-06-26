import { IsArray } from 'class-validator';

export class RecommendQuestionsDto {

  @IsArray()
  participantIds:number[];

}