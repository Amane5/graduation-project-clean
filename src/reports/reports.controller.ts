import { Body, Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '@/auth/guards/jwt.guard';

@Controller('reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService){}

    @Get('child/:childId')
    @UseGuards(JwtAuthGuard)
    async getChildReport(@Param('childId') childId:string, @Req() req){
        return this.reportsService.getChildReport(Number(childId) , req.user.sub)
    }

    @Get('story/:storyId')
    @UseGuards(JwtAuthGuard)
    async getStoryReport(@Param('storyId') storyId:string, @Req() req){
        return this.reportsService.getStoryReport(Number(storyId) , req.user.sub)
    }
}
