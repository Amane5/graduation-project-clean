import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '@/auth/guards/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UpdateDocumentChildrenDto } from './dto/UpdateDocumentChildrenDto.dto';

@Controller('documents')
export class DocumentsController {
    constructor(private readonly documentService:DocumentsService){}
    //api to upload files 
    @Post('upload')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(
    FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueName =
          Date.now() + '-' + Math.round(Math.random() * 1e9);

        cb(null, uniqueName + extname(file.originalname));
      },
    }),
  }),
    )
    async uploadDocuments(
    @Req() req,
    @UploadedFile() file: Express.Multer.File,
    @Body('childIds') childIds: string | string[],
    ) {

    console.log("RAW CHILD IDS:", childIds);

    const normalizedChildIds = Array.isArray(childIds)
        ? childIds.map(Number)
        : [Number(childIds)];

    console.log("NORMALIZED IDS:", normalizedChildIds);

    return this.documentService.uploadDocuments(
        req.user.sub,
        file,
        normalizedChildIds
    );
    }
    
    @Get()
    @UseGuards(JwtAuthGuard)
    async getDocuments(@Req() req){
        return this.documentService.getDocuments(req.user.sub)
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    async deleteDocument(@Req() req, @Param('id') id:string){
        return this.documentService.deleteDocument(req.user.sub, Number(id))
    }

    @Patch(':id/children')
    @UseGuards(JwtAuthGuard)
    async updateDocumentChildren(
        @Req() req,
        @Param('id') id:string,
        @Body('childIds') childIds: string | string[],
    ){
      const normalizedChildIds = Array.isArray(childIds)
        ? childIds.map(Number)
        : [Number(childIds)];
        return this.documentService.updateDocumentChildren(
            req.user.sub,
            Number(id),
            normalizedChildIds
        )
    }
}
