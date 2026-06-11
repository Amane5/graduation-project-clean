import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { AiService } from 'src/ai/ai.service';
import { AskQuestionDto } from './dto/ask-question.dto';
import { prisma } from '@/lib/prisma';

@Injectable()
export class QuestionService {
  constructor(
    @Inject(forwardRef(() => AiService))
    private readonly aiService: AiService,
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

  // async handleQuestion(
  //   body: AskQuestionDto,
  //   question: string | undefined,
  //   childId: number,
  //   files?: any[],
  // ) {
  //   let finalQuestion = question || '';
  //   let imageDescription = '';
  //   let audioTranscription = '';
  //   let imageUrl = '';
  //   const originalQuestion = body.question || '';

  //   if ((!body.question || body.question.trim() === '') && !files) {
  //     throw new BadRequestException('Qustion or file is required');
  //   }

  //   const child = await prisma.user.findFirst({
  //     where: {
  //       id: childId,
  //       type: 'child',
  //     },
  //   });

  //   if (!child) {
  //     throw new NotFoundException('Child not found');
  //   }

  //   if (!child.birthDate) {
  //     throw new BadRequestException({
  //       message: 'Child birthDate is missing',
  //       error: 'BIRTHDATE_REQUIRED',
  //     });
  //   }

  //   const age = this.calculateAge(child.birthDate);

  //   if (files && files.length > 0) {
  //     for (const file of files) {
  //       if (file.mimetype.startsWith('audio')) {
  //         audioTranscription = await this.aiService.speechToText(file.path);

  //         finalQuestion = [finalQuestion, audioTranscription]
  //           .filter(Boolean)
  //           .join(' ');
  //       }

  //       if (file.mimetype.startsWith('image')) {
  //         imageDescription = await this.aiService.analyzeImage(file.path, age);

  //         finalQuestion = [finalQuestion, imageDescription]
  //           .filter(Boolean)
  //           .join(' ');
  //       }
  //     }
  //   }

  //   const answer = await this.aiService.generateAnswer(finalQuestion, age);
  //   const audioFile = await this.aiService.textToSpeech(answer);
  //   let conversationId: number | undefined;

  //   if (body.conversationId) {
  //     conversationId = Number(body.conversationId);

  //     if (isNaN(conversationId)) {
  //       throw new BadRequestException('conversationId must be a number');
  //     }
  //   }
  //   if (!conversationId) {
  //     const title = await this.aiService.generateTitle(finalQuestion);
  //     const newConversation = await prisma.conversation.create({
  //       data: {
  //         childId: childId,
  //         title: title,
  //       },
  //     });

  //     conversationId = newConversation.id;
  //   }

  //   await prisma.question.create({
  //     data: {
  //       question: originalQuestion,
  //       imageDescription: imageDescription || null,
  //       voiceText: audioTranscription || null,
  //       answer,
  //       childId,
  //       conversationId,
  //     },
  //   });

  //   const shouldGenerate =
  //     await this.aiService.shouldGenerateImage(finalQuestion);

  //   if (shouldGenerate) {
  //     imageUrl = await this.aiService.generateImage(finalQuestion);
  //   }
  //   console.log('Question:', question);
  //   return {
  //     conversationId,
  //     question: originalQuestion || null,
  //     explanation: answer,
  //     imageDescription,
  //     audioTranscription,
  //     audioUrl: `/uploads/${audioFile}`,
  //     imageUrl,
  //   };
  // }


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
  };
}

  async saveAfterStream(data: {
    question: string;
    answer: string;
    conversationId: number;
    audioUrl?: string;
    imageUrl?: string;
    responseMode?: string;
    journeyData?: any;
  }) {
    const { question, answer, conversationId, audioUrl, imageUrl, responseMode, journeyData } = data;
    const savedQuestion = await prisma.question.create({
      data:{
        question,
        answer,
        conversationId,
        audioUrl,
        imageUrl,
        responseMode,
        journeyData
      }
    })

  }
}
