import { prisma } from '@/lib/prisma';
import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import OpenAI from 'openai';

@Injectable()
export class ChildrenService {
  private openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  async getChildren(parentId: number) {
    const children = await prisma.user.findMany({
      where: {
        parentId,
        type: 'child',
      },
    });

    return {
      message: 'Children fetched successfully',
      data: children,
    };
  }

  async getDashboardStats(parentId: number) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalChildren, questionsToday] = await Promise.all([
      prisma.user.count({
        where: {
          parentId,
          type: 'child',
        },
      }),
      prisma.question.count({
        where: {
          createdAt: {
            gte: startOfToday,
          },
          conversation: {
            user: {
              parentId,
              type: 'child',
            },
          },
        },
      }),
    ]);

    return {
      message: 'Dashboard stats fetched successfully',
      data: {
        totalChildren,
        questionsToday,
        activeMinutes: null,
      },
    };
  }

  async deleteChild(childId: number, parentId: number) {
    const child = await prisma.user.findFirst({
      where: {
        id: childId,
        parentId,
        type: 'child',
      },
    });

    if (!child) {
      throw new NotFoundException({
        message: 'Child not found',
        error: 'CHILD_NOT_FOUND',
      });
    }

    await prisma.user.delete({
      where: { id: childId },
    });

    return {
      message: 'Child deleted successfully',
    };
  }

  async updateChild(childId: number, dto: UpdateChildDto, parentId: number) {
    const child = await prisma.user.findFirst({
      where: {
        id: childId,
        parentId,
        type: 'child',
      },
    });

    if (!child) {
      throw new NotFoundException({
        message: 'Child not found',
        error: 'CHILD_NOT_FOUND',
      });
    }

    const data = {
      ...dto,
      ...(dto.password
        ? {
            password: await bcrypt.hash(dto.password, 10),
          }
        : {}),
      ...(dto.birthDate
        ? {
            birthDate: new Date(dto.birthDate),
          }
        : {}),
    };

    const updated = await prisma.user.update({
      where: { id: childId },
      data: data,
    });

    return {
      message: 'Child updated successfully',
      data: updated,
    };
  }

  async createChild(dto: CreateChildDto, parentId: number) {
    if (!parentId) {
      throw new UnprocessableEntityException({
        message: 'Invalid parent',
        error: 'INVALID_PARENT',
      });
    }
    if (!dto.username || !dto.password || !dto.firstName) {
      throw new UnprocessableEntityException({
        message: 'Missing required fields',
        error: 'MISSING_FIELDS',
      });
    }
    console.log('DTO:', dto);
    const existingChild = await prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existingChild) {
      throw new UnprocessableEntityException({
        message: 'Child already exists',
        error: 'CHILD-EXISTS',
      });
    }

    const vectorStore = await this.openai.vectorStores.create({
      name:`${dto.firstName}-store`
    })
    console.log('VECTOR STORE:', vectorStore);
    console.log('VECTOR STORE ID:', vectorStore.id);
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const child = await prisma.user.create({
      data: {
        username: dto.username,
        firstName: dto.firstName,
        lastName: dto.lastName,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        vectorStoreId:vectorStore.id,
        password: hashedPassword,
        type: 'child',
        parentId: parentId,
        readingLevel: dto.readingLevel,
        responseLength: dto.responseLength,
        learningStyle: dto.learningStyle,
        interests: dto.interests,
        gender:dto.gender,
        blockedTopics: dto.blockedTopics || [],
      },
    });
    return {
      message: 'Child created successfully',
      data: child,
    };
  }

  async getAccount(parentId: number) {
    const parent = await prisma.user.findUnique({
      where: { id: parentId },
    });
    const children = await prisma.user.findMany({
      where: { parentId: parentId, type: 'child' },
    });

    const users = [parent, ...children];
    const data = users.map((user) => ({
      username: user?.username,
      firstName: user?.firstName,
      lastName: user?.lastName,
      type: user?.type,
      email: user?.type === 'parent' ? user?.email : undefined,
    }));

    return {
      message: 'Accounts fetched successfully',
      data,
    };
  }
}
