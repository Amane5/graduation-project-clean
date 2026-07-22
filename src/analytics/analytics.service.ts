import { AiService } from '@/ai/ai.service';
import { prisma } from '@/lib/prisma';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class AnalyticsService {
    constructor(private readonly ai:AiService){}

    async processQuestion(questionId:number){
        const question = await prisma.question.findUnique({
            where: { id: questionId },
        });

        if (!question) {
            throw new NotFoundException('question not found')
        };

        const exists = await prisma.questionAnalytics.findUnique({
        where: { questionId },
        });

        if (exists) return;
        
        const response = await this.ai.classifyAnalytics(
        question.question,
        question.answer,
        // language,
        );

        let data;
        try {
        data = JSON.parse(response.choices[0].message.content || '{}');
        } catch {
        data = {};
        }

        await prisma.questionAnalytics.create({
        data: {
            questionId: question.id,

            category: data.category || null,
            subcategory: data.subcategory || null,

            curiosityScore: data.curiosityScore ?? 0,
            curiosityReason: data.curiosityReason || null,

            creativityScore: data.creativityScore ?? 0,
            creativityReason: data.creativityReason || null,

            analyticalScore: data.analyticalScore ?? 0,
            analyticalReason: data.analyticalReason || null,

            emotionalSignal: data.emotionalSignal || null,
            skills: data.skills || [],
        },
        });
        return { success: true };
    }
}
