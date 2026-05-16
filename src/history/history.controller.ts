import { JwtAuthGuard } from '@/auth/guards/jwt.guard';
import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { HistoryService } from './history.service';

@Controller('history')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}
  @Get(':childId')
  getHistory(@Param('childId') childId: number, @Req() req) {
    return this.historyService.getHistory(req.user.id, childId);
  }
}
