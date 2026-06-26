import { JwtAuthGuard } from '@/auth/guards/jwt.guard';
import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ChallengeService } from './challenge.service';
import { CreateChallengeDto } from './dto/CreateChallengeDto.dto';
import { UpdateChallengeDto } from './dto/UpdateChallengeDto.dto';
import { SubmitAnswerDto } from './dto/SubmitAnswerDto.dto';
import { RecommendQuestionsDto } from './dto/RecommendQuestionsDto.dto';
import { RecommendAnswerDto } from './dto/RecommendAnswerDto.dto';

@Controller('challenge')
export class ChallengeController {
    constructor(private readonly challengeService:ChallengeService){}

    @Post('')
    @UseGuards(JwtAuthGuard)
    async createChallenge(@Req() req, @Body() dto:CreateChallengeDto){
        return this.challengeService.createChallenge(req.user.sub, dto)
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    async getChallenges(@Req() req){
        return this.challengeService.getChallenges(req.user.sub)
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    async updateChallenge(@Req() req, @Body() dto:UpdateChallengeDto, @Param('id') challengeId:string){
        return this.challengeService.updateChallenge(req.user.sub, dto, Number(challengeId))
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    async deleteChallenge(@Req() req, @Param('id') challengeId: string){
        return this.challengeService.deleteChallenge(req.user.sub, Number(challengeId))
    }

    @Get('my-active')
    @UseGuards(JwtAuthGuard)
    async myActiveChallenges(@Req() req){
        return this.challengeService.myActiveChallenges(req.user.sub)
    }

    // تفاضيل التحدي للطفل
    @Get(':id/play')
    @UseGuards(JwtAuthGuard)
    async getChallengeForChild(@Req() req, @Param('id') challengeId:string){
        return this.challengeService.getChallengeForChild(req.user.sub, Number(challengeId))
    }

    @Post('question/:id/answer')
    @UseGuards(JwtAuthGuard)
    async submitAnswer(@Req() req, @Param('id') questionId:string, @Body() dto:SubmitAnswerDto){
        return this.challengeService.submitAnswer(req.user.sub, Number(questionId), dto)
    }

    @Post(':id/finish')
    @UseGuards(JwtAuthGuard)
    async challengeFinish(@Req() req, @Param('id') challengeId:string){
        return this.challengeService.challengeFinish(req.user.sub, Number(challengeId))
    }

    @Get(':id/my-results')
    @UseGuards(JwtAuthGuard)
    async childResults(@Req() req, @Param('id')  challengeId:string){
        return this.challengeService.childResults(req.user.sub, Number(challengeId))
    }

    @Get(':id/leaderboard')
    @UseGuards(JwtAuthGuard)
    async leaderBoard(@Req() req, @Param('id') id:string){
        return this.challengeService.leaderBoard(req.user.sub, Number(id))
    }

    @Post('recommend-questions')
    @UseGuards(JwtAuthGuard)
    async recommendQuestions(@Req() req, @Body() dto:RecommendQuestionsDto){
        return this.challengeService.recommendQuestions(req.user.sub, dto)
    }

    @Post('recommend-answers')
    @UseGuards(JwtAuthGuard)
    async recommendAnswers(@Req() req, @Body() dto:RecommendAnswerDto){
        return this.challengeService.recommendAnswers(req.user.sub, dto)
    }

    @Get(':id/winner')
    @UseGuards(JwtAuthGuard)
    async winner(@Req() req,@Param('id') id:string){
    return this.challengeService.winner(req.user.sub,Number(id))
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async getChallenge(@Req() req, @Param('id') challengeId:string){
        console.log(challengeId)
        return this.challengeService.getChallenge(req.user.sub, Number(challengeId))
    }
}
