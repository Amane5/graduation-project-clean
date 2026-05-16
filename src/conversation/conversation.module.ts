import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { AiService } from '@/ai/ai.service';

@Module({
  providers: [ConversationService, AiService],
  controllers: [ConversationController],
  exports:[ConversationService]
})
export class ConversationModule {}
