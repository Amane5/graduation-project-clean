import { Module } from '@nestjs/common';
import { QuestionModule } from './question/question.module';
// import { AppController } from './app.controller';
// import { AppService } from './app.service';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { ChildrenModule } from './children/children.module';
import { ConversationModule } from './conversation/conversation.module';
import { HistoryModule } from './history/history.module';


@Module({
  imports: [QuestionModule, AiModule, AuthModule, ChildrenModule, ConversationModule, HistoryModule],
})
export class AppModule {}
