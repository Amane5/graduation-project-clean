import { Module, forwardRef } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { QuestionModule } from '../question/question.module';
import { ConversationModule } from '../conversation/conversation.module';
import { FirebaseService } from './firebase.service';

@Module({
  imports: [forwardRef(() => QuestionModule), ConversationModule],
  providers: [AiService, FirebaseService],
  controllers: [AiController],
  exports: [AiService],
})

export class AiModule {}