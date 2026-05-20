import { Injectable, ForbiddenException } from '@nestjs/common';
import { prisma } from '@/lib/prisma';

@Injectable()
export class HistoryService {
  async getHistory(parentId: number, userId: number) {
    const child = await prisma.user.findFirst({
      where: {
        id: userId,
        parentId: parentId,
      },
    });

    if (!child) {
      throw new ForbiddenException('Not allowed');
    }

    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { lastActivity: 'desc' },
    });
    return conversations ?? [];
  }

}
