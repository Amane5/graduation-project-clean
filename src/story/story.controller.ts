import { JwtAuthGuard } from '@/auth/guards/jwt.guard';
import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { CreateStoryDto } from './Dto/create-story.dto';
import { StoryService } from './story.service';
import { UpdateStoryDto } from './Dto/update-story.dto';
@Controller('story')
export class StoryController {
    constructor(private readonly storyService:StoryService){}
    //generate story
    @Post('generate')
    @UseGuards(JwtAuthGuard)
    async generateStory(@Body() dto:CreateStoryDto , @Req() req){
        return this.storyService.generateStory(dto, req.user.sub)
    }

    //for children to see their stories 
    @Get('')
    @UseGuards(JwtAuthGuard)
    async getMyStories(@Req() req){
        return this.storyService.getMyStories(req.user.sub)
    }

    //for parent to see specific child's stories 
    @Get('child/:childId')
    @UseGuards(JwtAuthGuard)
    async getChildStories(@Req() req, @Param('childId') childId:string){
        return this.storyService.getChildStories(req.user.sub , Number(childId))
    }

    //update story
    @Put(':id')
    @UseGuards(JwtAuthGuard)
    async updateStory(
        @Req() req ,
        @Body() dto:UpdateStoryDto,
        @Param('id') storyId : string){
            return this.storyService.updateStory(req.user.sub , dto , Number(storyId))
        }

}
