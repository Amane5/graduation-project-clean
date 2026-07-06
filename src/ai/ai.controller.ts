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
  UploadedFile,
  Param,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AiService } from './ai.service';
import { QuestionService } from 'src/question/question.service';
import { ConversationService } from '../conversation/conversation.service';
import { FirebaseService } from './firebase.service';
import { JwtAuthGuard } from '@/auth/guards/jwt.guard';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AskQuestionDto } from '@/question/dto/ask-question.dto';
import { prisma } from '@/lib/prisma';
import { JsonWebTokenError } from '@nestjs/jwt';
import { DrawingStoryService } from './drawing-story.service';
import { StartDrawingStoryDto } from './dto/start-drawing-story.dto';
import { GenerateDrawingStoryDto } from './dto/generate-drawing-story.dto';

type AuthenticatedRequest = Request & {
  user: {
    sub: number;
    type: string;
  };
};

type UploadedAttachment = {
  kind: 'image' | 'audio' | 'file';
  name: string;
  url: string;
  mimeType: string;
  description?: string;
};

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    @Inject(forwardRef(() => QuestionService))
    private readonly questionService: QuestionService,
    private readonly conversationService: ConversationService,
    private readonly firebaseService: FirebaseService,
    private readonly drawingStoryService:DrawingStoryService
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

  private buildUploadUrl(file: Express.Multer.File): string {
    return `/uploads/${file.filename}`;
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
    @Req() req,
  ) {
    const { question, conversationId, mode = 'normal', } = body;

    let finalQuestion = question || '';
    let imageDescription = '';
    let audioTranscription = '';
    const uploadedAttachments: UploadedAttachment[] = [];

    const userId = req.user.sub;
    console.log(req.user);
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

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

    const gender = currentUser.gender || '';

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
        console.log(files);
        const attachment: UploadedAttachment = {
          kind: file.mimetype.startsWith('image/')
            ? 'image'
            : file.mimetype.startsWith('audio/')
              ? 'audio'
              : 'file',
          name: file.originalname,
          url: this.buildUploadUrl(file),
          mimeType: file.mimetype,
        };

        // AUDIO
        if (file.mimetype.startsWith('audio')) {
          audioTranscription = await this.aiService.speechToText(file.buffer);
          attachment.description = audioTranscription;

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
          attachment.description = imageDescription;

          finalQuestion = [finalQuestion, imageDescription]
            .filter(Boolean)
            .join(' ');
        }

        uploadedAttachments.push(attachment);
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

    
    const stream = await this.aiService.streamAnswer(
      userId,
      finalQuestion,
      Number(age),
      currentUser.firstName,
      Number(convId),
      readingLevel,
      responseLength,
      learningStyle,
      interests,
      gender,
      blockedTopics,
      mode,
    );

    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(`event: mode\n`);
    res.write(
      `data: ${JSON.stringify({
        mode,
      })}\n\n`,
    );
    let fullText = '';
    let audioUrl = '';
    let imageUrl = '';
    try {
      let parserBuffer = '';
        let currentSection = '';
      for await (const event of stream) {
        console.log(event.type);
        if(event.type === 'response.created') {
          res.write(`event: progress\n`);
          res.write(
            `data: ${JSON.stringify({
              step: "AI started writing the story..."
            })}\n\n`,
          );
        }

        if(event.type === 'response.in_progress') {
          res.write(`event: progress\n`);
          res.write(
            `data: ${JSON.stringify({
              step: "✍️ Writing story scenes..."
            })}\n\n`,
          );
        }

        // if (event.type === 'response.output_text.delta') {
        //   const chunk = event.delta;

        //   fullText += chunk;
        //   res.write(`event: text\n`);

        //   res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        // }
        
        if (event.type === 'response.output_text.delta') {
          const chunk = event.delta;

          fullText += chunk;

          if (mode === 'normal') {
            res.write(`event: text\n`);
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          }

          if (mode === 'journey') {
            parserBuffer += chunk;

            const sections = [
              'TITLE',
              'INTRODUCTION',
              'STORY',
              'EXPLANATION',
              'FACTS',
              'CHALLENGE',
              'QUESTIONS',
              'IMAGE_PROMPT',
            ];

            for (const section of sections) {
              const marker = `[[${section}]]`;

              if (parserBuffer.includes(marker)) {
                currentSection = section;

                parserBuffer = parserBuffer.replace(marker, '');

                res.write(`event: journey_section\n`);
                console.log('SECTION FOUND', section);
                res.write(
                  `data: ${JSON.stringify({
                    section: section.toLowerCase(),
                  })}\n\n`,
                );
              }
            }

            if (currentSection) {
              res.write(`event: journey_delta\n`);

              res.write(
                `data: ${JSON.stringify({
                  section: currentSection.toLowerCase(),
                  chunk,
                })}\n\n`,
              );
            }
          }
        }

      }

      //audio
      if(currentUser.fcmToken){
        await this.firebaseService.sendProgressNotification(
        currentUser.fcmToken,
        '🎙️ Generating audio...',
      );
      }

      const audioFile = await this.aiService.textToSpeechChat(fullText);
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

      const shouldGenerate =
        await this.aiService.shouldGenerateImage(finalQuestion);
      if (shouldGenerate) {
        if(currentUser.fcmToken){
          await this.firebaseService.sendProgressNotification(
          currentUser.fcmToken,
          '🎨 Creating illustrations...',
        );
        }
        
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
        imageDescription,
        voiceText: audioTranscription,
        responseMode: mode,
        journeyData:
          mode === 'journey' || uploadedAttachments.length > 0
            ? {
                ...(mode === 'journey' ? { content: fullText } : {}),
                ...(uploadedAttachments.length > 0
                  ? { attachments: uploadedAttachments }
                  : {}),
              }
            : undefined,
      });
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
    try {
      if (currentUser.fcmToken) {
        await this.firebaseService.sendNotification(
          currentUser.fcmToken,
          'AI Response Ready',
          'Your Answer Is Ready',
        );
      }
    } catch (err) {
      console.error('FCM ERROR (ignored):', err);
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

  @Post('fcm-token')
  @UseGuards(JwtAuthGuard)
  async saveToken(@Req() req, @Body() body: { token: string }) {
    console.log('FCM TOKEN RECEIVED:', body.token);
    await prisma.user.update({
      where: { id: req.user.sub },
      data: { fcmToken: body.token },
    });
    console.log('FCM TOKEN RECEIVED:', body.token);
    console.log('USER:', req.user.sub);
    return {
      success: true,
    };
  }

  @Post("drawing-story/start")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
  FileInterceptor('image', {
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
  async startDrawingStory(@Req() req,@UploadedFile() file: Express.Multer.File){
  console.log("FILE RECEIVED:", file);
  return this.drawingStoryService.startDrawingStory(req.user.sub, file)
  }

  @Post('drawing-story/message')
  @UseGuards(JwtAuthGuard)
  async sendDrawingStoryMessage(@Req() req: AuthenticatedRequest,@Body() body: { conversationId: number; message: string }) {
    return this.drawingStoryService.sendMessage(
      req.user.sub,
      body.conversationId,
      body.message,
    );
  }

  @Post('drawing-story/generate-story')
  @UseGuards(JwtAuthGuard)
  async generateStoryFromDrawing(@Req() req: AuthenticatedRequest , @Body() dto:GenerateDrawingStoryDto){
    return this.drawingStoryService.generateStoryFromDrawing(req.user.sub, dto.conversationId)
  }

  @Get('drawing-story/session/:conversationId')
  @UseGuards(JwtAuthGuard)
  async getSession(@Req() req: AuthenticatedRequest, @Param('conversationId') id: number) {
    return this.drawingStoryService.getSession(req.user.sub, Number(id));
}
}
