import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';
import { CreateChallengeQuestionDto } from './CreateChallengeQuestionDto.dto';


export class UpdateChallengeDto {
    @IsOptional()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
    @IsOptional()

  startAt: string;

  @IsDateString()
    @IsOptional()
  endAt: string;

  @IsArray()
  @ArrayMinSize(1)
    @IsOptional()
  participantIds: number[];

  @IsOptional()
questions: CreateChallengeQuestionDto[];

  // @IsArray()
  //   @IsOptional()
  // @ArrayMinSize(1)
  // @ValidateNested({ each: true })
  // @Type(() => CreateChallengeQuestionDto)
  // questions: CreateChallengeQuestionDto[];
}