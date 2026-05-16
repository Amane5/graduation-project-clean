import { prisma } from '@/lib/prisma';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { AiService } from 'src/ai/ai.service';
@Injectable()
export class ConversationService {
  constructor(private readonly aiService: AiService) {}

  async createConversation(question: string, childId: number) {
    const title = question
      ? await this.aiService.generateTitle(question)
      : 'New Chat';

    const conversation = await prisma.conversation.create({
      data: {
        childId,
        title,
      },
    });
    console.log('DTO:',  question );
    console.log('titleeeeeeee', title)
    return {
      message: 'Conversation created',
      data: conversation,
    };
  }

  async getConversations(childId: number) {
    const conversations = await prisma.conversation.findMany({
      where: { childId },
      include: {
        questions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Conversation fetched',
      data: conversations.map((conv) => ({
        id: conv.id,
        title: conv.title || `Conversation ${conv.id}`,
        lastActivity: conv.questions[0]?.createdAt ?? conv.createdAt,
      })),
    };
  }

  async deleteConversation(conversationId: number, userId: number) {
    try {
      const conv = await prisma.conversation.findFirst({
  where: {
    id: conversationId,
    OR: [
      { childId: userId },
      {
        child: {
          parentId: userId,
        },
      },
    ],
  },
});

      if (!conv) throw new NotFoundException('Conversation not found');

      await prisma.question.deleteMany({
        where: { conversationId },
      });

      await prisma.conversation.delete({
        where: { id: conversationId },
      });

      return { message: 'Conversation deleted' };
    } catch (err) {
      console.log('DELETE ERROR:', err);
      throw err;
    }
  }
}
