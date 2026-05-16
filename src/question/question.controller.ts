import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { QuestionService } from './question.service';
import { AskQuestionDto } from './dto/ask-question.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt.guard';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('ask')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);

          cb(null, uniqueName + extname(file.originalname));
        },
      }),
    }),
  )
  async askQuestion(
    @Body() body: AskQuestionDto,
    @UploadedFiles() files: any[],
    @Req() req,
  ) {
    return this.questionService.handleQuestion(
      body,
      body.question,
      req.user.sub,
      files,
    );
  }

  // @UseGuards(JwtAuthGuard)
  // @Get(':conversationId/messages')
  // getMessages(@Param('conversationId') id: string, @Req() req) {
  //   return this.questionService.getConversationMessages(
  //     Number(id),
  //     req.user.sub,
  //     req.user.type,
  //   );
  // }
      @UseGuards(JwtAuthGuard)
    @Get(':conversationId/messages')
    getMessages(@Param('conversationId') id:string, @Req() req){
        return this.questionService.getConversationMessages(Number(id), req.user.sub)
    }
}
