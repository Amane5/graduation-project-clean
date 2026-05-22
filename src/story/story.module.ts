import { Module } from '@nestjs/common';
import { StoryService } from './story.service';
import { StoryController } from './story.controller';
import { AiModule } from '@/ai/ai.module';

@Module({
  providers: [StoryService],
  controllers: [StoryController],
  imports: [AiModule]
})
export class StoryModule {}
