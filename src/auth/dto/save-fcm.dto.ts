import { IsString } from "class-validator";

export class SaveFcmDto{
    @IsString()
    fcmToken:string
}