import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AiService } from 'src/ai/ai.service';
import { AskQuestionDto } from './dto/ask-question.dto';
import { prisma } from '@/lib/prisma';
import { AnalyticsService } from '@/analytics/analytics.service';
import { AggregationService } from '@/analytics/aggregation.service';

@Injectable()
export class QuestionService {
  constructor(
    @Inject(forwardRef(() => AiService))
    private readonly aiService: AiService,
    private readonly analyticsService:AnalyticsService,
    private readonly aggregationService:AggregationService
  ) {}

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    const birth = new Date(birthDate);

    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }

async getConversationMessages(
  conversationId: number,
  userId: number,
  userType: string,
) {

  // المستخدم الحالي
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!currentUser) {
    throw new ForbiddenException('User not found');
  }

  let conversation;

  // إذا Child
  if (userType === 'child') {

    conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

  }

  // إذا Parent
  else if (userType === 'parent') {

    // أولاده
    const children = await prisma.user.findMany({
      where: {
        parentId: userId,
      },
      select: {
        id: true,
      },
    });

    const allowedUserIds = [
      userId,
      ...children.map((c) => c.id),
    ];

    conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: {
          in: allowedUserIds,
        },
      },
    });
  }

  if (!conversation) {
    throw new ForbiddenException('Unauthorized access');
  }

  const messages = await prisma.question.findMany({
    where: {
      conversationId,
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      id: true,
      question: true,
      imageDescription: true,
      voiceText: true,
      answer: true,
      createdAt: true,
      audioUrl: true,
      imageUrl: true,

      responseMode: true,
      journeyData: true,
    },
  });

  return {
    message: 'messages fetched',
    data: messages,
    conversation: {
    id: conversation.id,
    userId: conversation.userId,
  },
  };
}

  async saveAfterStream(data: {
    question: string;
    answer: string;
    conversationId: number;
    audioUrl?: string;
    imageUrl?: string;
    imageDescription?: string;
    voiceText?: string;
    responseMode?: string;
    journeyData?:
      | Prisma.InputJsonValue
      | Prisma.NullableJsonNullValueInput;
  }) {
    const {
      question,
      answer,
      conversationId,
      audioUrl,
      imageUrl,
      imageDescription,
      voiceText,
      responseMode,
      journeyData,
    } = data;
    const savedQuestion = await prisma.question.create({
      data:{
        question,
        answer,
        conversationId,
        audioUrl,
        imageUrl,
        imageDescription,
        voiceText,
        responseMode,
        journeyData
      }
    })

    await this.analyticsService.processQuestion(savedQuestion.id);
    const conversation = await prisma.conversation.findUnique({
    where: {
        id: conversationId,
      },
    });

    if (conversation) {
      await this.aggregationService.generateDailyReport(
        conversation.userId,
      );
    }
  }
}
