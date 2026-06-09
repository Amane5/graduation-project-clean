import { IsArray, IsInt } from 'class-validator';

export class UpdateDocumentChildrenDto {
  @IsArray()
  @IsInt({ each: true })
  childIds: number[];
}