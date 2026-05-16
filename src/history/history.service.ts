import { Injectable, ForbiddenException } from '@nestjs/common';
import { prisma } from '@/lib/prisma';

@Injectable()
export class HistoryService {
  async getHistory(parentId: number, childId: number) {
    const child = await prisma.user.findFirst({
      where: {
        id: childId,
        parentId: parentId,
      },
    });

    if (!child) {
      throw new ForbiddenException('Not allowed');
    }

    const conversations = await prisma.conversation.findMany({
      where: { childId },
      orderBy: { lastActivity: 'desc' },
    });
    return conversations ?? [];
  }

}
