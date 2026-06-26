import { Module, forwardRef } from '@nestjs/common';
import { QuestionController } from './question.controller';
import { QuestionService } from './question.service';
import { AiModule } from 'src/ai/ai.module';
import { JwtModule } from '@nestjs/jwt';
import { AnalyticsModule } from '@/analytics/analytics.module';

@Module({
  imports: [forwardRef(() => AiModule),forwardRef(() => AnalyticsModule) , JwtModule],
  controllers: [QuestionController],
  providers: [QuestionService],
  exports:[QuestionService]
})
export class QuestionModule {}
