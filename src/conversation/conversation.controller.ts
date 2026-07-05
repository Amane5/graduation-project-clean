import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { JwtAuthGuard } from '@/auth/guards/jwt.guard';

type AuthenticatedRequest = {
  user: {
    sub: number;
  };
};

@Controller('conversation')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  //create new conversation
  // @UseGuards(JwtAuthGuard)
  // @Post()
  // create(@Body() dto: CreateConversationDto) {
  //   return this.conversationService.createConversation(dto);
  // }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req: AuthenticatedRequest, @Body('question') question: string) {
    const userId = Number(req.user.sub);

    return this.conversationService.createConversation(question, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':userId')
  getAll(@Param('userId') userId: string, @Req() req: AuthenticatedRequest) {
    const requestedUserId = Number(userId);

    if (requestedUserId !== req.user.sub) {
      throw new ForbiddenException('Unauthorized conversation access');
    }

    return this.conversationService.getConversations(requestedUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':conversationId')
  deleteConversation(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    return this.conversationService.deleteConversation(conversationId, userId);
  }
}
