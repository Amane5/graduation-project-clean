import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt.guard';

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
  create(@Req() req, @Body('question') question: string) {
    const userId = Number(req.user.sub);

    return this.conversationService.createConversation(question, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':userId')
  getAll(@Param('userId') userId: string) {
    return this.conversationService.getConversations(Number(userId));
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':conversationId')
  deleteConversation(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Req() req,
  ) {
    const userId = req.user.sub;
    return this.conversationService.deleteConversation(conversationId, userId);
  }
}
