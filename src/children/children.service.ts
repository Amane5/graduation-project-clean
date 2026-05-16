import { prisma } from '@/lib/prisma';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateChildDto } from './dto/create-child.dto';

@Injectable()
export class ChildrenService {
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

  async updateChild(childId: number, dto: any, parentId: number) {
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

    let data: any = { ...dto };

    //  password
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    } else {
      delete data.password;
    }

    //  birthDate
    if (dto.birthDate) {
      data.birthDate = new Date(dto.birthDate);
    }

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

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const child = await prisma.user.create({
      data: {
        username: dto.username,
        firstName: dto.firstName,
        lastName: dto.lastName,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        password: hashedPassword,
        type: 'child',
        parentId: parentId,
        readingLevel: dto.readingLevel,
        responseLength: dto.responseLength,
        learningStyle: dto.learningStyle,
        interests: dto.interests,
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
