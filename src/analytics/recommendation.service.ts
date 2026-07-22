import { AiService } from "@/ai/ai.service";
import { prisma } from "@/lib/prisma";
import { Injectable } from "@nestjs/common";
import { QuestionAnalytics } from "@prisma/client";

@Injectable()
export class RecommendationService {
    constructor(private readonly ai:AiService){}
    async generate(childId: number, language: string = 'en',) {
      const report = await prisma.childDailyReport.findFirst({
          where: { childId },
          orderBy: { createdAt: 'desc' },
      });

      if (!report) return [];

      const recommendations = await this.ai.generateRecommendations(report, language);

      
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

    async generateEmotionSummary(analytics: QuestionAnalytics[], language: string = 'en',) {
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
 The application language is: ${language}

Return the emotional summary in this language.
        Return ONE sentence only.

        Emotional signals:
        ${emotions.join(', ')}

        If signals are valid, summarize emotional behavior.
        If unclear, return null.

        `
        );

          return response;
      }

    async generateAnalyticsExplanations(
  analytics: QuestionAnalytics[],
  curiosityAvg: number,
  creativityAvg: number,
  analyticalAvg: number,
  language: string = 'en',
) {
  const data = {
    curiosityAvg: Math.round(curiosityAvg * 10) / 10,
    creativityAvg: Math.round(creativityAvg * 10) / 10,
    analyticalAvg: Math.round(analyticalAvg * 10) / 10,

    curiosityReasons: analytics
      .map(a => a.curiosityReason)
      .filter((reason): reason is string => Boolean(reason)),

    creativityReasons: analytics
      .map(a => a.creativityReason)
      .filter((reason): reason is string => Boolean(reason)),

    analyticalReasons: analytics
      .map(a => a.analyticalReason)
      .filter((reason): reason is string => Boolean(reason)),

    totalQuestions: analytics.length,
  };

  return this.ai.generateAnalyticsExplanations(
    data,
    language,
  );
}
}