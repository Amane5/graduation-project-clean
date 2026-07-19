import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { prisma } from '@/lib/prisma';
import { AiService } from './ai.service';
import { QuestionService } from '@/question/question.service';
import * as fs from 'fs';
import { StoryService } from '@/story/story.service';
import { FirebaseService } from './firebase.service';
import { progressStatus } from './progress-status';

@Injectable()
export class DrawingStoryService {
    constructor(private readonly aiService:AiService, private readonly storyService:StoryService, private readonly questionService:QuestionService,private readonly firebaseService:FirebaseService){}

  private async getOwnedSession(childId: number, conversationId: number) {
    const session = await prisma.drawingStorySession.findFirst({
      where: {
        conversationId,
        childId,
      },
    });

    if (!session) {
      throw new NotFoundException('Drawing session not found');
    }

    return session;
  }

  async createSession(childId: number,drawingImageUrl: string,drawingAnalysis: any,conversationId: number ) {
    const child = await prisma.user.findUnique({
      where: {
        id: childId,
      },
    });

    if (!child) {
      throw new NotFoundException(
        'Child not found',
      );
    }

    return prisma.drawingStorySession.create({
      data: {
        childId,

        drawingImageUrl,

        drawingAnalysis,

        conversationId,
      },
    });
  }

  async startDrawingStory(childId:number, file: Express.Multer.File){
    if (!file) {
    throw new NotFoundException("No image uploaded");
    }
    // const base64Image = file.buffer.toString('base64');
const base64Image = fs.readFileSync(file.path).toString("base64");
  // const imageUrl = `data:${file.mimetype};base64,${base64Image}`;
  const imageUrl = `data:${file.mimetype};base64,${base64Image}`;

    const drawingAnalysis = await this.aiService.analyzeDrawing(imageUrl);
    const conversation = await prisma.conversation.create({
        data:{

            userId:childId,

            title:"Drawing Story",

        }

    });

    const session = await this.createSession(

    childId,

    imageUrl,

    drawingAnalysis,

    conversation.id,

    );

    const firstQuestion=await this.aiService.generateDrawingInterview(drawingAnalysis);


    await prisma.question.create({

        data:{

            conversationId:conversation.id,

            question:"",

            answer:firstQuestion.reply,

            responseMode:"drawing_story",

        }

    });

    return{

    sessionId:session.id,

    conversationId:
    conversation.id,

    reply:firstQuestion.reply,

    finished:false

    };
  }

  private buildInterviewPrompt(drawingAnalysis:any,history:any[],lastMessage:string){

    let prompt=`

    You are interviewing someone about a drawing.

    The goal is to collect information that will help create a children's story.

    Always ask about the drawing itself or the characters inside it.

    The drawing has already been analyzed.

    Drawing analysis:

    ${JSON.stringify(drawingAnalysis,null,2)}

    Conversation:

    `;

    for(const item of history){

    prompt+=`

    Child:
    ${item.question}

    AI:
    ${item.answer}

    `;

    }
    prompt += `

    Child:

    ${lastMessage}

    `;

    prompt+=`

    Continue the interview.

    Rules:

    - Ask ONLY ONE question.

    - Never ask two questions.

    - Keep it short.

    - Speak like a friendly teacher.

    - Do NOT repeat previous questions.

    -Language rules:

    - Detect the language of the child's latest message.
    - If the latest message is Arabic, ask the next question in Arabic.
    - If the latest message is English, ask the next question in English.
    - Keep using the child's language throughout the interview.
    - Never translate the child's words unless they ask you to.

    Focus only on:
    - the characters
    - their feelings
    - their goals
    - what happens next
    - where they go
    - why they do things
    - relationships between characters
    Do NOT ask about:
- the real user
- their family
- their child
- parenting

Never use phrases like:
- your child
- your son
- your daughter
- as a parent
Always refer to characters inside the drawing.

Examples:

Good:
- What does the boy do after scoring the goal?
- Why is the rabbit hiding?
- Where does the princess go next?
- What happens after this picture?
- What is the dragon looking for?

Bad:
- What does your child want to do?
- What adventure should your child have?
- What does your son think?

    Your interview should contain AT MOST 5 questions.

    Usually finish after 3–5 questions.

    Do not ask about unimportant visual details such as:
    - colors
    - weather
    - door color
    - sky color

    Only ask questions that help build the story.

    When you have enough information to write a complete story based on the drawing, return

    {
      "reply":"",
      "finished":true
    }

    Do not continue asking questions after that.

    Otherwise

    {
    "reply":"...",
    "finished":false
    }

    Return ONLY JSON.

    `;
    console.log(prompt)
    return prompt;

}

    async sendMessage(childId:number,conversationId:number,message:string){
      console.log(">>>>>>>> SEND MESSAGE CALLED <<<<<<<<");
      const session = await this.getOwnedSession(childId, conversationId);

      if (session.interviewFinished) {
      return {
          reply: "Interview already finished",
          finished: true,
      };
      }

      // if (!session.interviewFinished) {
      // throw new BadRequestException("Interview not finished yet");
      // }

      const history= await prisma.question.findMany({

      where:{
      conversationId
      },

      orderBy:{
      createdAt:"asc"
      }

      });

      const count = await prisma.question.count({
        where: { conversationId }
      });

      if (count + 1 >= 5) {
        await prisma.drawingStorySession.update({
          where: { conversationId },
          data: {
            interviewFinished: true,
            status: "READY",
          },
        });

        return {
          reply: "Interview finished 🎉",
          finished: true,
        };
      }
    const prompt = this.buildInterviewPrompt(session.drawingAnalysis,history,message);
    console.log(prompt.length);
    const result= await this.aiService.chatStrict(prompt);
//     const result = {
//     reply: "This is a test question 😊",
//     finished: false,
// };

    await this.questionService.saveAfterStream({

    question:message,

    answer:result.reply,

    conversationId,
    responseMode: 'drawing_story',

    });

    if (result.finished) {
    await prisma.drawingStorySession.update({
        where: { conversationId },
        data: {
        interviewFinished: true,
        status: 'READY',
        },
    });
    }
console.log("RETURNING:", {
    reply: result.reply,
    finished: result.finished,
});
    return {
    reply: result.reply,
    finished: result.finished,
    };

}

    async getSession(childId:number, conversationId:number){
    return this.getOwnedSession(childId, conversationId);

    }

    async generateStoryFromDrawing(childId:number, conversationId:number){
        const currentUser = await prisma.user.findUnique({
        where: {
            id: childId,
        },
        });  
        const session = await this.getOwnedSession(childId, conversationId);

        const messages = await prisma.question.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        });

        const conversationText = messages
        .map(m => `Q: ${m.question}\nA: ${m.answer}`)
        .join('\n');

        const storyPrompt = `
        You are a children's story writer.

        You will generate a complete illustrated story based on:

        1. A child's drawing analysis:
        ${JSON.stringify(session.drawingAnalysis, null, 2)}

        2. A conversation with the child:
        ${conversationText}

        Language requirements:

        - Detect the language used in the conversation.
        - Write the entire story in the same language as the conversation.
        - If the conversation is mostly Arabic, write EVERYTHING in Arabic.
        - If the conversation is mostly English, write EVERYTHING in English.
        - Do not translate the conversation.
        - Do not mix Arabic and English.
        - All titles, scene titles, scene content, and image prompts must use the same language.

        Requirements:
        - Create a complete children's story inspired by the drawing.
        - Use both the drawing analysis and the conversation.
        - Respect what the child said in the conversation
        - Make it child-friendly
        - The story must have a clear beginning, middle, and ending.
        - The story MUST contain between 3 and 5 scenes.
        - Never generate fewer than 3 scenes.
        - Every scene must naturally continue from the previous one.
        - Each scene should move the story forward.
        - Each scene must include:
        - title
        - content
        - imagePrompt

        IMPORTANT:

        The "scenes" array MUST contain at least 3 scene objects.

        Returning fewer than 3 scenes is INVALID.

        Return ONLY valid JSON:

        {
        "title": "",
        "content": "",
        "scenes": [
            {
            "sceneOrder": 1,
            "title": "",
            "content": "",
            "imagePrompt": ""
            }
        ]
        }
        `;

        if (currentUser?.fcmToken) {
        await this.firebaseService.sendProgressNotification(
            currentUser.fcmToken,
            progressStatus.WRITING_STORY,
        );
        }
        const aiResponse = await this.aiService.generateStory(storyPrompt);
        const cleaned = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();

        const parsed = JSON.parse(cleaned);

        return this.storyService.generateStoryFromPrebuilt(parsed, {
        childId,
        educationalGoal: 'drawing_story',
        storyType: 'drawing',
        storyLength: 'medium',
        withImages: true,
        withAudio: true,
        });
    }
}

