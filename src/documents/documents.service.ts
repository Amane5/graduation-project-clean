import { prisma } from '@/lib/prisma';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import OpenAI from 'openai';
import * as fs from 'fs';

@Injectable()
export class DocumentsService {

    private openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    });

    private async getAuthorizedChildren(parentId: number, childIds: number[]) {
        const normalizedChildIds = [...new Set(childIds)]
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0);

        if (!normalizedChildIds.length) {
            throw new BadRequestException('At least one child must be selected');
        }

        const children = await prisma.user.findMany({
            where: {
                id: { in: normalizedChildIds },
                parentId,
                type: 'child',
            },
        });

        if (children.length !== normalizedChildIds.length) {
            throw new ForbiddenException('One or more selected children are not accessible');
        }

        return {
            childIds: normalizedChildIds,
            children,
        };
    }

    async uploadDocuments(parentId:number , file:Express.Multer.File, childIds:number[]){
        if (!file) {
            throw new BadRequestException('File upload is required');
        }
        
  console.log('ORIGINAL FILE NAME:', file.originalname);

        const { childIds: authorizedChildIds, children } = await this.getAuthorizedChildren(parentId, childIds);

        const uploadedFile = await this.openai.files.create({
            file:fs.createReadStream(file.path),
            purpose:'assistants'
        })

        for(const child of children){
            if(!child.vectorStoreId) continue

            await this.openai.vectorStores.files.create(
            child.vectorStoreId,
            {
                file_id: uploadedFile.id,
            },
            )
        }
        
        
        const document = await prisma.document.create({
            data: {
                title: Buffer.from(file.originalname, 'latin1').toString('utf8'),
                fileName: file.filename,
                fileUrl: file.path,

                openaiFileId: uploadedFile.id,

                uploadedById: parentId,

                children: {
                create: authorizedChildIds.map((childId) => ({
                    childId,
                })),
                },
            }
        })
        return{
            success:true,
            document
        }
    }

    async getDocuments(parentId:number){
        const documents = await prisma.document.findMany({
            where:{uploadedById:parentId},
            include:{
                children: {
                    include: {
                    child: true,
                    },
                },
            },
            orderBy:{
                createdAt:'desc'
            }
        })
        return {
            success:true,
            documents
        }
    }    

    async deleteDocument(parentId:number , documentId:number){
        const document = await prisma.document.findFirst({
            where:{
                id:documentId,
                uploadedById:parentId,
            }
        })
        if(!document){
            throw new NotFoundException('Document not found')
        }
        await this.openai.files.delete(document.openaiFileId)

        if(fs.existsSync(document.fileUrl)){
            fs.unlinkSync(document.fileUrl)
        }

        await prisma.document.delete({
            where:{id:documentId}
        })
        return{
            success:true
        }
    }

    async updateDocumentChildren(parentId:number , documentId:number, childIds:number[]){
        const document = await prisma.document.findFirst({
            where:{id:documentId, uploadedById:parentId},
            include:{
                children:true
            }
        })

        if(!document){
            throw new NotFoundException('Document not found')
        }

        const { childIds: authorizedChildIds, children } = await this.getAuthorizedChildren(parentId, childIds);
        const childrenById = new Map(children.map((child) => [child.id, child]));

        const currentChildIds = document.children.map((child) => child.childId)
        const addChildren = authorizedChildIds.filter((id) => !currentChildIds.includes(id))
        const removeChildren = currentChildIds.filter((id) => !authorizedChildIds.includes(id))

        for (const childId of addChildren) {
            const child = childrenById.get(childId);

            if (child?.vectorStoreId) {
                await this.openai.vectorStores.files.create(
                child.vectorStoreId,
                {
                    file_id: document.openaiFileId,
                }
                );
            }

            await prisma.childDocument.create({
                data: {
                documentId,
                childId,
                },
            });
        }

        for (const childId of removeChildren) {
        const child = await prisma.user.findUnique({
            where: { id: childId },
        });

        if (child?.vectorStoreId) {
            await this.openai.vectorStores.files.delete(
            document.openaiFileId,
            {
                vector_store_id: child.vectorStoreId,
            }
            );
        }

        await prisma.childDocument.deleteMany({
            where: {
            documentId,
            childId,
            },
        });
        }
        return{
            success:true
        }
    }
}
