import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateChallengeDto } from './dto/CreateChallengeDto.dto';
import { prisma } from '@/lib/prisma';
import { NotFoundError } from 'openai';
import { UpdateChallengeDto } from './dto/UpdateChallengeDto.dto';
import { SubmitAnswerDto } from './dto/SubmitAnswerDto.dto';
import { RecommendQuestionsDto } from './dto/RecommendQuestionsDto.dto';
import { recommendQuestionsPrompt } from './prompts/recommend-questions.prompt';
import { AiService } from '@/ai/ai.service';
import { recommendAnswerPrompt } from './prompts/recommend-answer.prompt';
import { evaluateAnswerPrompt } from './prompts/evaluate-answer.prompt';
import { RecommendAnswerDto } from './dto/RecommendAnswerDto.dto';

@Injectable()
export class ChallengeService {
    constructor(private readonly aiService:AiService){}
    async createChallenge(parentId:number, dto:CreateChallengeDto){
        console.log(dto)
        const children = await prisma.user.findMany({
        where:{
        id:{
            in:dto.participantIds
        },
        parentId
        }
        })

        if(children.length !==dto.participantIds.length){
            throw new NotFoundException(
            'Some selected children not found'
            )
        }

        const challenge = await prisma.challenge.create({
        data:{
        parentId,

        title:dto.title,

        description:dto.description,

        startAt:new Date(dto.startAt),

        endAt:new Date(dto.endAt),

        participants:{
            create:dto.participantIds.map(
                childId => ({
                    childId
                })
            )
        },

        questions:{
            create:dto.questions.map(
                question => ({
                    question:question.question,

                    expectedAnswer:
                    question.expectedAnswer,

                    points:question.points
                })
            )
        }
    },

    include:{
        participants:true,
        questions:true
    }
        })

        return challenge

    }

    async getChallenges(parentId:number){
    return prisma.challenge.findMany({
            where:{
                parentId
            },

            include:{
                participants:{
                    include:{
                        child:{
                            select:{
                                id:true,
                                firstName:true
                            }
                        }
                    }
                },

                questions:true
            },

            orderBy:{
                createdAt:'desc'
            }
    })
    }

    // async getChallenge(parentId:number , challengeId:number){
    //     console.log(parentId, challengeId)
    // const challenge =await prisma.challenge.findFirst({
    //     where:{
    //         id:challengeId,
    //         parentId
    //     },

    //     include:{
    //         participants:{
    //             include:{
    //                 child:true
    //             }
    //         },

    //         questions:true
    //     }
    // })

    // if(!challenge){
    //     throw new NotFoundException(
    //     'Challenge not found'
    //     )
    // }

    // return challenge
    // }

    async getChallenge(parentId:number , challengeId:number){
        console.log(parentId, challengeId)
    const challenge =await prisma.challenge.findFirst({
        where:{
            id:challengeId,
            parentId
        },

        include:{
            participants:{
                include:{
                    child:{
                        select:{
                            id:true,
                            firstName:true,
                            lastName:true
                        }
                    }
                }
            },

            questions:{
                include:{
                    answers:{
                        include:{
                            child:{
                                select:{
                                    id:true,
                                    firstName:true,
                                    lastName:true
                                }
                            }
                        }
                    }
                }
            }
        }
    })

    if(!challenge){
        throw new NotFoundException(
        'Challenge not found'
        )
    }

    return {
    id: challenge.id,
    title: challenge.title,
    description: challenge.description,
    startAt: challenge.startAt,
    endAt: challenge.endAt,
    createdAt: challenge.createdAt,
    participants: challenge.participants.map(p => ({
        id: p.child.id,
        firstName: p.child.firstName,
        lastName: p.child.lastName,
        totalScore: p.totalScore,
    completedAt: p.completedAt,
    })),

    questions: challenge.questions.map(q => ({
        id: q.id,

        question: q.question,

        expectedAnswer: q.expectedAnswer,

        points: q.points,

        answers:
            q.answers.length
            ? q.answers.map(a => ({
                childId: a.child.id,
                childName: a.child.firstName,
                answer: a.answer,
                isCorrect: a.isCorrect,
                earnedPoints: a.earnedPoints
            }))
            : []
    }))
}
    }

    async updateChallenge(parentId:number , dto:UpdateChallengeDto, challengeId:number){
        const challenge = await prisma.challenge.findFirst({
            where:{
                id:challengeId,
                parentId
            }
        })

        if(!challenge){
            throw new NotFoundException('Challenge not found')
        }

        if(new Date() >= challenge.startAt){
            throw new Error('Cannot update challenge after it has started')
        }
console.log(dto.participantIds);
        const updatedChallenge = await prisma.challenge.update({
            where:{
                id:challengeId
            },

            data:{
                title:dto.title,
                description:dto.description,

                ...(dto.startAt && {
                    startAt:new Date(dto.startAt)
                }),

                ...(dto.endAt && {
                    endAt:new Date(dto.endAt)
                })
            }
        })

        if(dto.questions){
        await prisma.challengeQuestion.deleteMany({
            where:{
            challengeId
            }
        })

        await prisma.challengeQuestion.createMany({
            data:dto.questions.map(q => ({
            challengeId,
            question:q.question,
            expectedAnswer:q.expectedAnswer,
            points:q.points
            }))
        })
        }
        if(dto.participantIds){
        await prisma.challengeParticipant.deleteMany({
            where:{
            challengeId
            }
        })

        await prisma.challengeParticipant.createMany({
            data:dto.participantIds.map(childId => ({
            challengeId,
            childId
            }))
        })
        }
        return prisma.challenge.findUnique({
        where:{
            id:challengeId
        },

        include:{
            participants:true,
            questions:true
        }
        })
    }

    async deleteChallenge(parentId:number, challengeId:number){
        const challenge =
        await prisma.challenge.findFirst({
            where:{
                id:challengeId,
                parentId
            }
        })

        if(!challenge){
            throw new NotFoundException(
            'Challenge not found'
            )
        }

        await prisma.challenge.delete({
            where:{
                id:challengeId
            }
        })

        return {
            message:
            'Challenge deleted successfully'
        }
    }

    async myActiveChallenges(childId:number){
        const now = new Date()
        return prisma.challenge.findMany({
            where:{
                startAt:{
                    lte:now
                },
                endAt:{
                    gte:now
                },
                participants:{
                    some:{
                        childId
                    }
                }
            },
            include:{
                questions:true,
                participants: {
                where: { childId }, 
                select: {
                completedAt: true,
                totalScore: true
                }
            }
            },
            orderBy:{
                startAt:'desc'
            }
        })

    }

    async getChallengeForChild(childId:number , challengeId:number){
        const challenge = await prisma.challenge.findFirst({
            where:{id:challengeId,
                participants:{
                    some:{
                        childId
                    }
                }
            },
            include:{
                questions:{
                    select:{
                        id:true,
                        question:true,
                        points:true
                    }
                }
            }
        })

        if(!challenge){
            throw new NotFoundException('Challenge not found')
        }

        const participant =
        await prisma.challengeParticipant.findUnique({
            where:{
                challengeId_childId:{
                    challengeId,
                    childId
                }
            }
        })

        if(participant?.completedAt){
            throw new Error(
                'Challenge already completed'
            )
        }

        return challenge
    }

    async submitAnswer(childId:number, questionId:number, dto:SubmitAnswerDto){
        const question = await prisma.challengeQuestion.findUnique({
            where:{id:questionId}
        })

        if(!question){
            throw new NotFoundException('Question not found')
        }

        const existingAnswer = await prisma.challengeAnswer.findFirst({
            where:{childId, questionId}
        })

        if(existingAnswer){
            throw new Error('You already answered this question')
        }

        const participant = await prisma.challengeParticipant.findUnique({
            where:{
                challengeId_childId:{
                    challengeId: question.challengeId,
                    childId
                }
            }
        })

        if(!participant){
            throw new NotFoundException(
                'You are not participant in this challenge'
            )
        }

        if(participant?.completedAt){
            throw new Error(
                'Challenge already completed'
            )
        }
         return prisma.challengeAnswer.create({
            data:{
                challengeId:question.challengeId,

                questionId,

                childId,

                answer:dto.answer
            }
        })
    }

    async challengeFinish(childId:number, challengeId:number){
        const participant = await prisma.challengeParticipant.findUnique({
        where:{
            challengeId_childId:{
                challengeId,
                childId
            }
        }
        })

        if(participant?.completedAt){
        throw new Error('Challenge already completed')
        }

        const answers = await prisma.challengeAnswer.findMany({
            where:{
                challengeId,
                childId
            },

            include:{
                question:true
            }
        })

        let totalScore = 0
        for(const answer of answers){
            const aiResult = await this.aiService.evaluateAnswers(
                evaluateAnswerPrompt(
                    answer.question.question,
                    answer.question.expectedAnswer,
                    answer.answer
                )
            )

            const parsed = JSON.parse(aiResult || '{}')

            const isCorrect = parsed.correct === true

            const earnedPoints = isCorrect? answer.question.points: 0

            await prisma.challengeAnswer.update({
                where:{
                    id:answer.id
                },

                data:{
                    isCorrect,
                    earnedPoints
                }
            })
            totalScore += earnedPoints
        }

        await prisma.challengeParticipant.update({
            where:{
                challengeId_childId:{
                    challengeId,
                    childId
                }
            },

            data:{
                totalScore,
                completedAt:new Date()
            }
        })

        return {
            totalScore
        }
    }

    async childResults(childId:number,challengeId:number){
    const answers =
    await prisma.challengeAnswer.findMany({
        where:{
            childId,
            challengeId
        },
        include:{
            question:true
        }
    })

    const participant =
    await prisma.challengeParticipant.findUnique({
        where:{
            challengeId_childId:{
                challengeId,
                childId
            }
        }
    })

    const participants =
    await prisma.challengeParticipant.findMany({
        where:{
            challengeId
        },
        include:{
            child:true
        },
        orderBy:{
            totalScore:'desc'
        }
    })

    const allFinished = participants.every(
    p => p.completedAt !== null
    );

    if (!allFinished) {
    return {
        status: "pending",
        message: "Challenge not finished yet",
        totalScore: participant?.totalScore ?? 0,
        answers,
        isWinner: false,
        winners: []
    };
    }

    const highestScore =
    participants[0]?.totalScore ?? 0

    const winners =
    participants.filter(
        p => p.totalScore === highestScore
    )

    const isWinner =
    winners.some(
        w => w.childId === childId
    )

    return {
        status: "finished",
        totalScore: participant?.totalScore ?? 0,

        isWinner,

        winners:winners.map(
            w => ({
                id:w.child.id,
                firstName:w.child.firstName
            })
        ),

        answers
    }
    }

    async leaderBoard(parentId:number, challengeId:number){
        const challenge = await prisma.challenge.findFirst({
            where:{
                id:challengeId,
                parentId
            }
        })

        if(!challenge){
            throw new NotFoundException(
                'Challenge not found'
            )
        }

        return prisma.challengeParticipant.findMany({
            where:{
                challengeId
            },

            include:{
                child:{
                    select:{
                        id:true,
                        firstName:true,
                        lastName:true
                    }
                }
            },

            orderBy:{
                totalScore:'desc'
            }
        })
    }

    async recommendQuestions(parentId:number, dto:RecommendQuestionsDto){
        const children = await prisma.user.findMany({
            where:{
                id:{
                    in:dto.participantIds
                },
                parentId
            }
        })

        const interests = children.flatMap(
            child => child.interests
        )

        const ages =
        children.map(child => {

            const age =
            new Date().getFullYear()
            -
            child.birthDate!.getFullYear()

            return age
        })

        const prompt = recommendQuestionsPrompt(
            [...new Set(interests)],
            Math.min(...ages),
            Math.max(...ages)
        )

        const result = await this.aiService.generateQuestions(prompt)

        return JSON.parse(result || '{}')
    }

    async recommendAnswers(parentId:number, dto:RecommendAnswerDto){
    const result = await this.aiService.generateExpectedAnswer(
        recommendAnswerPrompt(
            dto.question
        )
    )

    return JSON.parse(
        result || '{}'
    )
    }

    async winner(parentId:number,challengeId:number){
    const challenge = await prisma.challenge.findFirst({
        where:{
        id:challengeId,
        parentId
        }
    })

    if(!challenge){
        throw new NotFoundException('Challenge not found')
    }


    const participants = await prisma.challengeParticipant.findMany({
        where:{
        challengeId
        },

        include:{
        child:true
        },

        orderBy:{
        totalScore:'desc'
        }
    })

    if(participants.length === 0){
        return null
    }

    const allFinished = participants.every(p => p.completedAt)

    if(!allFinished){
    throw new Error('Challenge not finished yet')
    }

    const highestScore = participants[0].totalScore

    const winners = participants.filter(
        p => p.totalScore === highestScore
    )

    return {
        score:highestScore,
        winners:winners.map(
        w => ({
            id:w.child.id,
            firstName:w.child.firstName
        })
        )
    }
    }
}
