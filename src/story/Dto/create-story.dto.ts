import { IsBoolean, IsNumber, IsString } from "class-validator";

export class CreateStoryDto{
    @IsString()
    educationalGoal:string;

    @IsString()
    storyType:string;

    @IsString()
    storyLength:string;

    @IsBoolean()
    withImages:boolean;

    @IsBoolean()
    withAudio:boolean

    @IsNumber()
    childId:number
}