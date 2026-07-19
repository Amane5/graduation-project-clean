import { IsString, IsNotEmpty, IsOptional, IsDateString, MinLength, IsIn, IsArray } from 'class-validator';

export class CreateChildDto {
  
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @IsIn(['beginner', 'intermediate', 'advanced'])
  readingLevel:string

  @IsIn(['short', 'medium' , 'detailed'])
  responseLength:string

  @IsIn(['story', 'logical' , 'playful' , 'visual'])
  learningStyle: string

  @IsIn(['male', 'female' ])
  gender: string

  @IsArray()
  interests: string[]

  @IsArray()
  @IsOptional()
  blockedTopics: string[]
}