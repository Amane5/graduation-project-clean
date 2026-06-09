import { AiService } from '@/ai/ai.service';
import { prisma } from '@/lib/prisma';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateQuestionDto } from './dto/create-questions.dto';
import { UpdateQuestionDto } from './dto/update-questions.dto';
import { buildQuestionsPrompt } from './prompt/question.prompt';
import { buildRegenerateQuestionsPrompt } from './prompt/regenerateQuestion.prompt';

@Injectable()
export class QuestionsService {
    constructor(private readonly aiService:AiService){}

    async getQuestions(userId:number, storyId:number){
        const story = await prisma.story.findUnique({
            where:{id:storyId},
            include:{
                child:true,
                questions:true
            }
        })

        if (!story) {
            throw new NotFoundException(
            'Story not found',
            );
        }

        const isParent =
        story.child.parentId === userId;

        const isChild =
            story.childId === userId;

        if (!isParent && !isChild) {
            throw new ForbiddenException(
            'Unauthorized',
            );
        }

        return story.questions;
    }

    async approveQuestions(parentId:number, storyId:number){
        const story = await prisma.story.findFirst({
            where: {
            id: storyId,
            },
            include: {
            child: true,
            },
        });

        if (!story) {
            throw new NotFoundException(
            'Story not found',
            );
        }

        if (
            story.child.parentId !== parentId
        ) {
            throw new ForbiddenException(
            'Unauthorized',
            );
        }

        return prisma.story.update({
            where: {
            id: storyId,
            },
            data: {
            questionsApproved: true,
            status: 'PUBLISHED',
            },
        });
    }

    async deleteQuestion(parentId:number, questionId:number){
        const question = await prisma.storyQuestion.findUnique({
            where:{id:questionId},
            include:{
                story: {
                    include:{
                        child:true
                    }
                }
            }
        });

        if (!question) {
            throw new NotFoundException(
            'Question not found',
            );
        }

        if (question.story.child.parentId !== parentId) {
            throw new ForbiddenException(
            'Unauthorized',
            );
        }

        await prisma.storyQuestion.delete({
            where: {
            id: questionId,
            },
        });

        return {
            success: true,
        }

    }

    async addQuestion(parentId:number, storyId:number, dto:CreateQuestionDto){
        const story = await prisma.story.findFirst({
            where:{id:storyId},
            include:{
                child:true
            }
        })

        if (!story) {
            throw new NotFoundException(
            'Story not found',
            );
        }

        if (
            story.child.parentId !== parentId
        ) {
            throw new ForbiddenException(
            'Unauthorized',
            );
        }
console.log('DTO:', dto);
console.log('QUESTION:', dto.question);
        return prisma.storyQuestion.create({
            data: {
            storyId,
            question: dto.question,
            },
        });
    }

    async updateQuestion(parentId: number,questionId: number,dto: UpdateQuestionDto) {
    const question =
        await prisma.storyQuestion.findUnique({
        where: {
            id: questionId,
        },
        include: {
            story: {
            include: {
                child: true,
            },
            },
        },
        });

    if (!question) {
        throw new NotFoundException(
        'Question not found',
        );
    }

    if (
        question.story.child.parentId !==
        parentId
    ) {
        throw new ForbiddenException(
        'Unauthorized',
        );
    }

    return prisma.storyQuestion.update({
        where: {
        id: questionId,
        },
        data: {
        question: dto.question,
        },
    });
    }

    async generateQuestion(parentId:number, storyId:number){
        const story = await prisma.story.findUnique({
            where:{id:storyId},
            include:{
                child:true,
                scenes:{
                    orderBy:{
                        sceneOrder:'asc'
                    }
                }
            }
        })

        if(!story){
            throw new NotFoundException('Story not found')
        }

        if(story.child.parentId !== parentId){
            throw new ForbiddenException('Unauthorized')
        }

        if (!story.isApproved) {
            throw new BadRequestException(
            'Story must be approved first',
            );
        }

        const prompt = buildQuestionsPrompt(story)

        const aiResponse = await this.aiService.generateQuestions(prompt)
        if (!aiResponse) {
            throw new BadRequestException(
                'AI failed to generate questions'
            )
        }
        const cleaned = aiResponse
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
        let parsed;
        try {
            parsed = JSON.parse(cleaned);
        } catch {
            throw new BadRequestException(
            'Invalid AI response',
            );
        }

        let savedQuestions:any[] = []
        for(const q of parsed.questions){
            const question = await prisma.storyQuestion.create({
                data:{
                    storyId,
                    question:q.question
                }
            })
            savedQuestions.push(question)
        }
        return savedQuestions
    }

    async regenerateQuestions(parentId:number, storyId:number){
        const story = await prisma.story.findUnique({
        where: {
        id: storyId,
        },
        include: {
        child: true,
        scenes:true,
        questions:true
        },
        });

        if (!story) {
            throw new NotFoundException(
            'Story not found',
            );
        }

        if (story.child.parentId !== parentId) {
            throw new ForbiddenException(
            'Unauthorized',
            );
        }

        const prompt = buildRegenerateQuestionsPrompt(
            story,
            story.questions
        );
        await prisma.storyQuestion.deleteMany({
            where: {
            storyId,
            },
        });

        return this.generateQuestion(
            parentId,
            storyId,
        );
    }
}
