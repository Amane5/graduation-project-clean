import { JwtAuthGuard } from '@/auth/guards/jwt.guard';
import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { CreateStoryDto } from './Dto/create-story.dto';
import { StoryService } from './story.service';
import { AiEditStoryDto, UpdateStoryDto } from './Dto/update-story.dto';
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

    //for parent to see all children's stories 
    @Get('children')
    @UseGuards(JwtAuthGuard)
    async getAllChildrenStories(@Req() req ){
        return this.storyService.getAllChildrenStories(req.user.sub)
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

    //approve story
    @Patch(':id/approve')
    @UseGuards(JwtAuthGuard)
    async approveStory(
    @Req() req,
    @Param('id') id: string,
    ){
    return this.storyService.approveStory(
        req.user.sub,
        Number(id),
    )
    }

    //edit story by ai 
    @Post(':id/ai-edit')
    @UseGuards(JwtAuthGuard)
    async updateStoryWithAi (@Req() req , @Body() body:any, @Param('id') storyId:string){
          console.log("BODY RECEIVED:", AiEditStoryDto);
        return this.storyService.updateStoryWithAi(req.user.sub , body.editRequest, Number(storyId))
    }

    //delete story
    @Delete(':storyId')
    @UseGuards(JwtAuthGuard)
    async deleteStory(@Param('storyId') storyId:string ,@Req() req){
        return this.storyService.deleteStory(Number(storyId), req.user.sub)
    }

    @Get(':id/edit-message')
    @UseGuards(JwtAuthGuard)
    async getEditMessages(@Req() req , @Param('id') storyId:string){
        return this.storyService.getEditMessages(req.user.sub , Number(storyId))
    }
}
