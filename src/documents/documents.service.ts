import { prisma } from '@/lib/prisma';
import { Injectable, NotFoundException } from '@nestjs/common';
import OpenAI from 'openai';
import * as fs from 'fs';
import { NotFoundError } from 'rxjs';

@Injectable()
export class DocumentsService {

    private openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    });

    async uploadDocuments(parentId:number , file:Express.Multer.File, childIds:number[]){
        const uploadedFile = await this.openai.files.create({
            file:fs.createReadStream(file.path),
            purpose:'assistants'
        })
        console.log('CHILD IDS:', childIds);
         const children = await prisma.user.findMany({
            where:{
            id:{
                in: childIds
            },
            // type:'child'
            }
        })
console.log(children)
        for(const child of children){
   console.log('LINK FILE TO:', child.vectorStoreId)

            if(!child.vectorStoreId) continue

            const linkedFile = await this.openai.vectorStores.files.create(
            child.vectorStoreId,
            {
                file_id: uploadedFile.id,
            },
            )
            console.log('LINKED FILE:', linkedFile)
        }
        
        
        const document = await prisma.document.create({
            data: {
                title: file.originalname,
                fileName: file.filename,
                fileUrl: file.path,

                openaiFileId: uploadedFile.id,

                uploadedById: parentId,

                children: {
                create: childIds.map((childId) => ({
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
        const document = await prisma.document.findUnique({
            where:{id:documentId}
        })
        if(!document){
            throw new NotFoundException('Document not found')
        }
        this.openai.files.delete(document.openaiFileId)

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

        const currentChildIds = document.children.map((child) => child.childId)
        const addChildren = childIds.filter((id) => !currentChildIds.includes(id))
        const removeChildren = currentChildIds.filter((id) => !childIds.includes(id))

        for (const childId of addChildren) {
            const child = await prisma.user.findUnique({
                where: { id: childId },
            });

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