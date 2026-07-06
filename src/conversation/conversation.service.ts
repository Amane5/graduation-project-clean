import { prisma } from '@/lib/prisma';
import { Injectable, NotFoundException } from '@nestjs/common';
import { AiService } from 'src/ai/ai.service';
@Injectable()
export class ConversationService {
  constructor(private readonly aiService: AiService) {}

  async createConversation(question: string, userId: number) {
    const title = question
      ? await this.aiService.generateTitle(question)
      : 'New Chat';

    const conversation = await prisma.conversation.create({
      data: {
        userId,
        title,
      },
    });

    return {
      message: 'Conversation created',
      data: conversation,
    };
  }

  async getConversations(userId: number) {
    const conversations = await prisma.conversation.findMany({
      where: { userId },
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

  async deleteConversation(conversationId: number, actorUserId: number) {
    try {
      const conv = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          OR: [
            {
              userId: actorUserId,
            },
            {
              user: {
                parentId: actorUserId,
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
