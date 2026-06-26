import { JwtAuthGuard } from '@/auth/guards/jwt.guard';
import { prisma } from '@/lib/prisma';
import { Controller, ForbiddenException, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AggregationService } from './aggregation.service';

@Controller('analytics')
export class AnalyticsController {
     constructor(
    private readonly aggregationService: AggregationService,
  ) {}

    @Get('report/:childId')
    @UseGuards(JwtAuthGuard)
    async getReport(@Param('childId') childId: number, @Req() req) {
        const userId = req.user.sub;

        const child = await prisma.user.findFirst({
        where: {
            id: Number(childId),
            parentId: userId,
        },
        });

        if (!child) throw new ForbiddenException();
        return prisma.childDailyReport.findFirst({
        where: { childId: Number(childId) },
        orderBy: { createdAt: 'desc' },
        });
    }

    @Post('generate/:childId')
async generate(@Param('childId') childId: string) {
  return this.aggregationService.generateDailyReport(
    Number(childId),
  );
}
}
