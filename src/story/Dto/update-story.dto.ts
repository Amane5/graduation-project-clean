import { IsArray, IsOptional, IsString } from "class-validator";

export class UpdateStoryDto{
    @IsOptional()
    @IsString()
    title?:string

    @IsOptional()
    @IsString()
    content?:string

    @IsArray()
    scenes:{
        id:number;
        title?:string;
        content:string
    }[]
}

export class AiEditStoryDto {
   editRequest:string
}