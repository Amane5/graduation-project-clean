import { Injectable } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { prisma } from "@/lib/prisma";
import { AggregationService } from "./aggregation.service";
import { Cron } from "@nestjs/schedule";

@Injectable()
export class AnalyticsCron {
  constructor(private readonly aggregation: AggregationService) {}

  @Cron('0 0 * * *') 
  async handleDailyReport() {
    const children = await prisma.user.findMany({
    where: { type: 'child' },
    });

    for (const child of children) {
    await this.aggregation.generateDailyReport(child.id);
    }
  }

}