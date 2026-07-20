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
  BadRequestException,
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
import { notificationKeys, progressStatus } from './progress-status';
import { promises as fs } from 'fs';
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
        // if (file.mimetype.startsWith('audio')) {
        //   audioTranscription = await this.aiService.speechToText(file.buffer);
        //   attachment.description = audioTranscription;

        //   finalQuestion = [finalQuestion, audioTranscription]
        //     .filter(Boolean)
        //     .join(' ');
        // }
        
        // if (file.mimetype.startsWith('audio/')) {
        //   const audioBuffer = await fs.readFile(file.path);

        //   audioTranscription = await this.aiService.speechToTextChat(
        //     audioBuffer,
        //     file.originalname,
        //   );

        //   attachment.description = audioTranscription;

        //   finalQuestion = [finalQuestion, audioTranscription]
        //     .filter(Boolean)
        //     .join(' ');
        // }

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

      console.log('[chat-stream] processed uploaded attachments', uploadedAttachments);
    }

    let convId = conversationId;

    if (!convId) {
      const newConversation = await this.conversationService.createConversation(
        question,
        userId,
      );

      convId = newConversation.data.id;
    }

    let clientAborted = false;
    let stream: Awaited<ReturnType<AiService['streamAnswer']>> | null = null;

    const handleClientAbort = () => {
      if (res.writableEnded || clientAborted) {
        return;
      }

      clientAborted = true;

      if (stream && !stream.ended && !stream.aborted) {
        stream.abort();
      }
    };

    req.on('close', handleClientAbort);

    stream = await this.aiService.streamAnswer(
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
        if (clientAborted) {
          break;
        }

        console.log(event.type);
        if(event.type === 'response.created') {
          res.write(`event: progress\n`);
          res.write(
            `data: ${JSON.stringify({
              stepKey: progressStatus.WRITING_STORY
            })}\n\n`,
          );
        }

        if(event.type === 'response.in_progress') {
          res.write(`event: progress\n`);
          res.write(
            `data: ${JSON.stringify({
              stepKey: progressStatus.WRITING_SCENES
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

          // if (mode === 'journey') {
          //   parserBuffer += chunk;

          //   const sections = [
          //     'TITLE',
          //     'INTRODUCTION',
          //     'STORY',
          //     'EXPLANATION',
          //     'FACTS',
          //     'CHALLENGE',
          //     'QUESTIONS',
          //     'IMAGE_PROMPT',
          //   ];

          //   for (const section of sections) {
          //     const marker = `[[${section}]]`;

          //     if (parserBuffer.includes(marker)) {
          //       currentSection = section;

          //       parserBuffer = parserBuffer.replace(marker, '');

          //       res.write(`event: journey_section\n`);
          //       console.log('SECTION FOUND', section);
          //       res.write(
          //         `data: ${JSON.stringify({
          //           section: section.toLowerCase(),
          //         })}\n\n`,
          //       );
          //     }
          //   }

          //   if (currentSection) {
          //     res.write(`event: journey_delta\n`);

          //     res.write(
          //       `data: ${JSON.stringify({
          //         section: currentSection.toLowerCase(),
          //         chunk,
          //       })}\n\n`,
          //     );
          //   }
          // }
          if (mode === 'journey') {
            parserBuffer += chunk;

            const markerRegex =
              /\[\[(TITLE|INTRODUCTION|STORY|EXPLANATION|FACTS|CHALLENGE|QUESTIONS|IMAGE_PROMPT)\]\]/;

            while (true) {
              const match = parserBuffer.match(markerRegex);

              if (!match) {
                break;
              }

              const markerIndex = match.index!;
              const marker = match[0];
              const section = match[1];

              // أي نص قبل الـ marker ينتمي للقسم السابق
              const textBeforeMarker = parserBuffer
                .slice(0, markerIndex)
                .trim();

              if (currentSection && textBeforeMarker) {
                res.write(`event: journey_delta\n`);
                res.write(
                  `data: ${JSON.stringify({
                    section: currentSection.toLowerCase(),
                    chunk: textBeforeMarker,
                  })}\n\n`,
                );
              }

                // انتقل للقسم الجديد
                currentSection = section;

                console.log('SECTION FOUND:', section);

                res.write(`event: journey_section\n`);
                res.write(
                  `data: ${JSON.stringify({
                    section: section.toLowerCase(),
                  })}\n\n`,
                );

                // احذف كل شيء حتى نهاية الـ marker
                parserBuffer = parserBuffer.slice(
                  markerIndex + marker.length,
                );
              }

              /*
              * نرسل النص الموجود في buffer فقط إذا كان آمناً
              * وليس من الممكن أن يكون جزءاً من marker.
              *
              * نحتفظ بآخر 20 حرف تقريباً لأن marker أطول من ذلك
              * وقد يكون مقسماً بين chunkين.
              */
              const safeLength = Math.max(
                0,
                parserBuffer.length - 20,
              );

                const safeText = parserBuffer.slice(0, safeLength);

                if (currentSection && safeText) {
                  res.write(`event: journey_delta\n`);

                  res.write(
                    `data: ${JSON.stringify({
                      section: currentSection.toLowerCase(),
                      chunk: safeText,
                    })}\n\n`,
                  );

                  parserBuffer = parserBuffer.slice(safeLength);
                }
              }
        }

      }

      if (mode === 'journey' && !clientAborted) {
        if (currentSection && parserBuffer.trim()) {
          res.write(`event: journey_delta\n`);
          res.write(
            `data: ${JSON.stringify({
              section: currentSection.toLowerCase(),
              chunk: parserBuffer,
            })}\n\n`,
          );
        }
      }

      if (!clientAborted) {
        // Generate secondary assets only for completed responses.
        if (currentUser.fcmToken) {
        await this.firebaseService.sendProgressNotification(
        currentUser.fcmToken,
        progressStatus.GENERATING_AUDIO,
      );
      }

      const cleanTtsText = mode === 'journey' ? fullText
        .replace(
          /\[\[(TITLE|INTRODUCTION|STORY|EXPLANATION|FACTS|CHALLENGE|QUESTIONS|IMAGE_PROMPT)\]\]/g,
          '',
        )
        .trim()
        : fullText;
      const audioFile = await this.aiService.textToSpeechChat(cleanTtsText);
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
          progressStatus.GENERATING_IMAGES,
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
      }
    } catch (error) {
      console.error(error);

      if (!clientAborted) {
        res.write(`event: error\n`);
        res.write(`data: error\n\n`);
      }
    }

    try {
      console.log('[chat-stream] saving streamed message', {
        conversationId: Number(convId),
        imageUrl,
        audioUrl,
        uploadedAttachments,
      });
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
      console.log('[chat-stream] streamed message saved', {
        conversationId: Number(convId),
      });
    } catch (error) {
      console.error('Error saving conversation:', error);
    }

    if (!clientAborted) {
      res.write(`event: done\n`);
      res.write(`data: done\n\n`);
    }

    try {
      if (!clientAborted && currentUser.fcmToken) {
        await this.firebaseService.sendNotification(
          currentUser.fcmToken,
          notificationKeys.AI_RESPONSE_READY_TITLE,
          notificationKeys.AI_RESPONSE_READY_BODY,
        );
      }
    } catch (err) {
      console.error('FCM ERROR (ignored):', err);
    }
    req.off('close', handleClientAbort);
    if (!clientAborted && !res.writableEnded) {
      res.end();
    }
  }

  @Post('speech-to-text')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('audio'))
  async speechToTextChat(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Audio file is required',
      );
    }

    const audioBuffer = file.buffer;

    const text =
      await this.aiService.speechToTextChat(
        audioBuffer,
        file.originalname,
      );

    return {
      text,
    };
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

