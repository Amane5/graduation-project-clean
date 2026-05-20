import {
  Controller,
  Post,
  Body,
  Res,
  Inject,
  forwardRef,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ForbiddenException,
  Get,
  Req,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AiService } from './ai.service';
import { QuestionService } from 'src/question/question.service';
import { ConversationService } from '../conversation/conversation.service';
import { FirebaseService } from './firebase.service';
import { JwtAuthGuard } from '@/auth/guards/jwt.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AskQuestionDto } from '@/question/dto/ask-question.dto';
import { prisma } from '@/lib/prisma';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    @Inject(forwardRef(() => QuestionService))
    private readonly questionService: QuestionService,
    private readonly conversationService: ConversationService,
    private readonly firebaseService: FirebaseService,
  ) {}

    private calculateAge(birthDate: Date): number {
    const today = new Date();
    const birth = new Date(birthDate);

    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }


  @Post('stream')
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
  async stream(
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Res() res: Response,
    @Req() req
  ) {
    const { question, conversationId } = body;

    let finalQuestion = question || '';
    let imageDescription = '';
    let audioTranscription = '';
  
    const userId = req.user.sub;
    console.log(req.user);
    const currentUser = await prisma.user.findUnique({
      where:{id: userId}
    }) 

    if (!currentUser || currentUser.tokenBalance <= 0) {
    console.log('Token balance:', currentUser?.tokenBalance);
    console.log('User:', currentUser);
    throw new ForbiddenException('Token limit exceeded');
    }

    const age = currentUser.birthDate
    ? this.calculateAge(currentUser.birthDate)
    : 10;

    const firstName = currentUser.firstName;

    const readingLevel = currentUser.readingLevel || '';

    const responseLength = currentUser.responseLength || '';

    const learningStyle = currentUser.learningStyle || '';

    const interests = currentUser.interests || [];

    const blockedTopics = currentUser.blockedTopics || [];

    if (conversationId) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: Number(conversationId),
        userId,
      },
    });

    if (!conversation) {
      throw new ForbiddenException('Unauthorized conversation');
    }
  }

    // PROCESS FILES
    if (files && files.length > 0) {
      for (const file of files) {
        // AUDIO
        if (file.mimetype.startsWith('audio')) {
          audioTranscription = await this.aiService.speechToText(file.path);

          finalQuestion = [finalQuestion, audioTranscription]
            .filter(Boolean)
            .join(' ');
        }

        // IMAGE
        if (file.mimetype.startsWith('image')) {
          imageDescription = await this.aiService.analyzeImage(
            file.path,
            Number(age),
          );

          finalQuestion = [finalQuestion, imageDescription]
            .filter(Boolean)
            .join(' ');
        }
      }
    }

    let convId = conversationId;

    if (!convId) {
      const newConversation = await this.conversationService.createConversation(
        question,
        userId,
      );

      convId = newConversation.data.id;
    }

    console.log('CONV ID:', convId);
    console.log('BODY:', body);
    console.log('conversationId FROM BODY:', conversationId);
    // const interests = Array.isArray(body.interests)
    //   ? body.interests
    //   : body.interests
    //     ? [body.interests]
    //     : [];
    // const blockedTopics = Array.isArray(body.blockedTopics)
    //   ? body.blockedTopics
    //   : body.blockedTopics
    //     ? [body.blockedTopics]
    //     : [];
    const stream = await this.aiService.streamAnswer(
      finalQuestion,
      Number(age),
      currentUser.firstName,
      Number(convId),
      readingLevel,
      responseLength,
      learningStyle,
      interests,
      blockedTopics,
    );

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullText = '';
    let audioUrl = '';
    let imageUrl = '';
    try {
      for await (const event of stream) {
        if (event.type === 'response.output_text.delta') {
          const chunk = event.delta;

          fullText += chunk;

          res.write(`event: text\n`);

          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }

        // if (event.type === 'response.completed') {
        //   res.write(`data: [DONE]\n\n`);
        // }
      }

      //audio
      const audioFile = await this.aiService.textToSpeech(fullText);
      audioUrl = `/uploads/${audioFile}`;
      console.log('FINAL AI RESPONSE:');
      console.log(fullText);
      res.write(`event: audio\n`);
      res.write(
        `data: ${JSON.stringify({
          audioUrl,
        })}\n\n`,
      );

      //image
      console.log('final question', finalQuestion);
      const shouldGenerate =
        await this.aiService.shouldGenerateImage(finalQuestion);
      if (shouldGenerate) {
        imageUrl = await this.aiService.generateImage(finalQuestion);
        res.write(`event: image\n`);
        res.write(
          `data: ${JSON.stringify({
            imageUrl,
          })}\n\n`,
        );
      }

      res.write(`event: done\n`);
      res.write(`data: done\n\n`);

      const finalResponse = await stream.finalResponse();
      const usage = finalResponse.usage;
      console.log(usage);
      const totalTokens = usage?.total_tokens || 0;
      const inputTokens = usage?.input_tokens || 0;
      const outputTokens = usage?.output_tokens || 0;
      await prisma.user.update({
        where: { id: userId },
        data: {
          tokenBalance: {
            decrement: totalTokens,
          },
          usedTokens: {
            increment: totalTokens,
          },
        },
      });

      await prisma.tokenUsage.create({
        data: {
          parentId: userId,
          childId: Number(userId),

          inputTokens,
          outputTokens,
          totalTokens,
        },
      });
      console.log('input tokens:', inputTokens);
      console.log('output tokens:', outputTokens);
      console.log('total tokens:', totalTokens);
    } catch (error) {
      console.error(error);

      res.write(`event: error\n`);
      res.write(`data: error\n\n`);
    }

    try {
      await this.questionService.saveAfterStream({
        question: question || '',
        answer: fullText,
        conversationId: Number(convId),
        audioUrl,
        imageUrl,
      });
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
    res.end();

  }

  @Get('me/tokens')
  @UseGuards(JwtAuthGuard)
  async getMyTokens(@Req() req) {
    const userId = req.user.sub;
    console.log('REQ USER:', req.user);
    return this.aiService.getTokenStats(userId);
  }
}
