import { AiService } from '@/ai/ai.service';
import { prisma } from '@/lib/prisma';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateQuestionDto } from './dto/create-questions.dto';
import { UpdateQuestionDto } from './dto/update-questions.dto';
import { buildQuestionsPrompt } from './prompt/question.prompt';
import { buildRegenerateQuestionsPrompt } from './prompt/regenerateQuestion.prompt';
import { SubmitAnswersDto } from './dto/submit-answer.dto';
import { buildEvaluationPrompt } from './prompt/question-evaluation.prompt';

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
            expectedAnswer: dto.expectedAnswer,
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
        expectedAnswer:dto.expectedAnswer,
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
                    question:q.question,
                    expectedAnswer: q.expectedAnswer,
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

    async submitAnswers(childId: number,storyId: number,dto: SubmitAnswersDto) {
        const story = await prisma.story.findUnique({
        where: {
            id: storyId,
        },
        include: {
            questions: true,
        },
        });

        if (!story) {
        throw new NotFoundException(
            'Story not found',
        );
        }

        if (story.childId !== childId) {
        throw new ForbiddenException(
            'Unauthorized',
        );
        }

        await prisma.storyAnswer.deleteMany({
        where: {
            storyId,
            childId,
        },
        });

        await prisma.storyAnswer.createMany({
        data: dto.answers.map((a) => ({
            storyId,
            questionId: a.questionId,
            childId,
            answer: a.answer,
        })),
        });

        const savedAnswers = await prisma.storyAnswer.findMany({
            where: {
                storyId,
                childId,
            },
        });

        const answersPayload = story.questions.map(question => {
            const childAnswer = dto.answers.find(
                a => a.questionId === question.id
            );

            return {
                questionId: question.id,
                question: question.question,
                expectedAnswer: question.expectedAnswer,
                childAnswer: childAnswer?.answer ?? "",
            };
        });
        
        

        const evaluationPrompt = buildEvaluationPrompt(story, answersPayload)

        const evaluateAnswers = await this.aiService.evaluateAnswers(evaluationPrompt)
        if(evaluateAnswers === null){
            throw new BadRequestException(
                'AI failed to evaluate answers'
            )
        }
        const cleanedEvaluation = evaluateAnswers
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        let parsed;

        try {
            parsed = JSON.parse(
                cleanedEvaluation,
            );
                    console.log("AI EVALUATION:");

        } catch {
            throw new BadRequestException(
                "Invalid evaluation response",
            );
        }
      
        if (!parsed.evaluations) {
            throw new BadRequestException(
                "Invalid evaluation structure",
            );
        }

        for (const evaluation of parsed.evaluations) {
            const answer = savedAnswers.find(
                a => a.questionId === evaluation.questionId,
            );

            if (!answer) {
            throw new BadRequestException(
                `Answer not found for question ${evaluation.questionId}`
            );
            }

            await prisma.storyAnswerEvaluation.create({
                data: {
                answerId: answer.id,
                score: evaluation.score,
                feedback: evaluation.feedback,
                },
            });
        }

        await prisma.storyReport.create({
        data: {
            storyId,
            childId,

            overallScore:
            parsed.overallScore,

            goalAchievement:
            parsed.goalAchievement,

            summary:
            parsed.summary,

            strengths:
            parsed.strengths,

            improvements:
            parsed.improvements,
        },
        });
        return {
            success: true,
            answers: savedAnswers
        };
    }
}
