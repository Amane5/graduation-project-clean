import { JwtAuthGuard } from '@/auth/guards/jwt.guard';
import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { HistoryService } from './history.service';

@Controller('history')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}
  @Get(':userId')
  getHistory(@Param('userId') userId: number, @Req() req) {
    return this.historyService.getHistory(req.user.sub, userId);
  }
}
