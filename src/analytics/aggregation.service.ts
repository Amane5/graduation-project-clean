import { prisma } from "@/lib/prisma";
import { Injectable } from "@nestjs/common";
import { RecommendationService } from "./recommendation.service";

@Injectable()
export class AggregationService {
  constructor(
  private readonly recommendationService:
    RecommendationService,
) {}

  async generateDailyReport(childId: number) {
    console.log('GENERATE REPORT START', childId);

    const analytics = await prisma.questionAnalytics.findMany({
    where: {
        question: {
        conversation: {
            userId: childId,
        },
        },
    },

    });
    
    console.log('FOUND ANALYTICS', analytics.length);

    const avg = (arr: number[]) =>
    arr.reduce((a, b) => a + b, 0) / (arr.length || 1);

    const curiosityAvg = avg(analytics.map(a => a.curiosityScore));
    const creativityAvg = avg(analytics.map(a => a.creativityScore));
    const analyticalAvg = avg(analytics.map(a => a.analyticalScore));

    const categoryMap: Record<string, number> = {};

    for (const a of analytics) {
        if (!a.category) continue;
        categoryMap[a.category] = (categoryMap[a.category] || 0) + 1;
    }

    const topCategories = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);

    const emotionalSummary = await this.recommendationService.generateEmotionSummary(analytics);
    const subMap: Record<string, number> = {};

    for (const a of analytics) {
    if (!a.subcategory) continue;

    subMap[a.subcategory] =
        (subMap[a.subcategory] || 0) + 1;
    }

    const topSubcategories = Object.entries(subMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);
    await prisma.childDailyReport.deleteMany({
    where: {
        childId,
    },
    });

    await prisma.childDailyReport.create({
    data: {
        childId,
        topCategories,
        topSubcategories,

        curiosityAvg,
        creativityAvg,
        analyticalAvg,

        emotionalSummary,
        insights: {
        totalQuestions: analytics.length,
        },
    },
    });

    await this.recommendationService.generate(childId);

  }
}