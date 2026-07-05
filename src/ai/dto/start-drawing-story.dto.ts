import { IsString } from "class-validator";

export class StartDrawingStoryDto{

    @IsString()

    imageUrl:string;

}