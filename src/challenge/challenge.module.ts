import { Module } from '@nestjs/common';
import { ChallengeService } from './challenge.service';
import { ChallengeController } from './challenge.controller';
import { AiModule } from '@/ai/ai.module';

@Module({
  imports:[AiModule],
  providers: [ChallengeService],
  controllers: [ChallengeController]
})
export class ChallengeModule {}
