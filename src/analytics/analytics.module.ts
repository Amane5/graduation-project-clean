import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AiService } from '@/ai/ai.service';
import { AiModule } from '@/ai/ai.module';
import { AggregationService } from './aggregation.service';
import { AnalyticsCron } from './analytics.cron';
import { RecommendationService } from './recommendation.service';

@Module({
  imports: [AiModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AggregationService,
    RecommendationService,
    AnalyticsCron,],
  exports:[AnalyticsService, AggregationService]
})
export class AnalyticsModule {}
