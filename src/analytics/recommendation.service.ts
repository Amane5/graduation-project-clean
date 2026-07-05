import { AiService } from "@/ai/ai.service";
import { prisma } from "@/lib/prisma";
import { Injectable } from "@nestjs/common";
import { QuestionAnalytics } from "@prisma/client";

@Injectable()
export class RecommendationService {
    constructor(private readonly ai:AiService){}
    async generate(childId: number) {
      const report = await prisma.childDailyReport.findFirst({
          where: { childId },
          orderBy: { createdAt: 'desc' },
      });

      if (!report) return [];

      const recommendations = await this.ai.generateRecommendations(report);

      
      await prisma.childDailyReport.update({
          where: {
          id: report.id,
          },
          data: {
          recommendations,
          },
      });

      return recommendations;
    }

    async generateEmotionSummary(analytics: QuestionAnalytics[]) {
      const emotions = analytics
        .map(a => a.emotionalSignal)
        .filter(Boolean);

      if (emotions.length < 3) {
        return null;
      }
      console.log(emotions);

      const response = await this.ai.askAnalytics(
        `
        You are analyzing children's emotional patterns.

        Return ONE sentence only.

        Emotional signals:
        ${emotions.join(', ')}

        If signals are valid, summarize emotional behavior.
        If unclear, return null.

        `
        );

          return response;
      }
}