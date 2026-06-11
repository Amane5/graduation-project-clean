import { prisma } from '@/lib/prisma';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class ReportsService {

    async getChildReport(childId:number, parentId:number){
        const child = await prisma.user.findFirst({
            where:{id:childId, parentId}
        })
        if(!child){
            throw new NotFoundException('Child not found')
        }

        const reports = await prisma.storyReport.findMany({
            where:{childId},
            include:{
                story:true
            },
            orderBy:{
                createdAt:'desc'
            }
        })
        return {
            success:true,
            reports
        }
    }

    async getStoryReport(storyId:number, parentId:number){
        const story = await prisma.story.findFirst({
            where:{id:storyId,
                child:{
                    parentId
                }
            }
        })
        if(!story){
            throw new NotFoundException('Story not found')
        }
        const report = await prisma.storyReport.findFirst({
            where:{
                storyId
            }
        })
        const evaluations = await prisma.storyAnswerEvaluation.findMany({
            where:{answer:{storyId}},
            include:{
                answer:{
                    include:{
                        question:true
                    }
                }
            }
        })
        return {
            success:true,
            report,
            evaluations
        }
    }
}
