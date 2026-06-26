import { JwtAuthGuard } from '@/auth/guards/jwt.guard';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-questions.dto';
import { UpdateQuestionDto } from './dto/update-questions.dto';
import { SubmitAnswersDto } from './dto/submit-answer.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('questions')
export class QuestionsController {
    constructor(private readonly questionsService: QuestionsService){}

    //generate questions for a story
    @Post('story/:storyId/generate')
    @UseGuards(JwtAuthGuard)
    async generateQuestion(@Req() req,@Param('storyId') storyId:string){
        return this.questionsService.generateQuestion(req.user.sub, Number(storyId))
    }

    //get questions for a story 
    @Get('story/:storyId')
    @UseGuards(JwtAuthGuard)
    async getQuestions(@Req() req,@Param('storyId') storyId:string){
        return this.questionsService.getQuestions(req.user.sub, Number(storyId))
    }

    //add question to a story
    @Post('story/:storyId/add')
    @UseGuards(JwtAuthGuard)
    async addQuestion(@Req() req,@Param('storyId') storyId:string , @Body() dto:CreateQuestionDto){
        return this.questionsService.addQuestion(req.user.sub, Number(storyId), dto)
    }

    //edit question 
    @Put(':questionId')
    @UseGuards(JwtAuthGuard)
    async updateQuestion(@Req() req,@Param('questionId') questionId:string , @Body() dto:UpdateQuestionDto){
        return this.questionsService.updateQuestion(req.user.sub, Number(questionId), dto)
    }

    //delete question
    @Delete(':questionId')
    @UseGuards(JwtAuthGuard)
    async deleteQuestion(@Req() req,@Param('questionId') questionId:string){
        return this.questionsService.deleteQuestion(req.user.sub, Number(questionId))
    }

    //approve questions for a story
    @Patch('story/:storyId/approve')
    @UseGuards(JwtAuthGuard)
    async approveQuestions(@Req() req,@Param('storyId') storyId:string){
        return this.questionsService.approveQuestions(req.user.sub, Number(storyId))
    }

    //regenerate questions if the parent update the story after approval
    @Post('story/:storyId/regenerate')
    @UseGuards(JwtAuthGuard)
    async regenerateQuestions(@Req() req,@Param('storyId') storyId:string){
        return this.questionsService.regenerateQuestions(req.user.sub, Number(storyId))
    }

    @Post(':storyId/answers')
    @UseGuards(JwtAuthGuard)
    async submitAnswers(@Req() req,@Param('storyId')storyId: number,@Body()dto: SubmitAnswersDto,) {
    return this.questionsService.submitAnswers(
        req.user.sub,
        storyId,
        dto,
    );
    }

    @Post(':questionId/tts')
    @UseGuards(JwtAuthGuard)
    async textToSpeech(@Req() req, @Body() @Param('questionId', ParseIntPipe) questionId:number) {
    return this.questionsService.generateQuestionAudio(req.user.sub, questionId);
    }

    @Post(':questionId/speech-to-text')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('audio'))
    async speechToText(@UploadedFile() file: Express.Multer.File,@Param('questionId', ParseIntPipe) questionId: number) {
    console.log(file);

    return this.questionsService.transcribeAnswer(
        questionId,
        file,
    );
    }
}
