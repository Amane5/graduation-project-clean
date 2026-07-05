import { Module, forwardRef } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { QuestionModule } from '../question/question.module';
import { ConversationModule } from '../conversation/conversation.module';
import { FirebaseService } from './firebase.service';
import { DrawingStoryService } from './drawing-story.service';
import { StoryService } from '@/story/story.service';

@Module({
  imports: [forwardRef(() => QuestionModule), ConversationModule],
  providers: [AiService, FirebaseService, DrawingStoryService, StoryService],
  controllers: [AiController],
  exports: [AiService, FirebaseService],
})

export class AiModule {}