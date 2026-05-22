import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import * as fs from 'fs';
import { prisma } from '@/lib/prisma';

@Injectable()
export class AiService {
  private openai: OpenAI;
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateAnswer(question: string, age: number): Promise<string> {
    try {
      const response = await this.openai.responses.create({
        model: 'gpt-4.1-mini',
        input: [
          {
            role: 'system',
            content: `
                You are a friendly teacher for children.

                Rules:
                - Use simple words and examples
                - Explain for a ${age}-year-old child
                - If the answer exists in the provided files, use it
                - If not, answer using your general knowledge
                - Do NOT say "I looked in the files"
                - Do NOT mention files, data, or sources
                - Just answer naturally like a teacher`,
          },
          {
            role: 'user',
            content: question,
          },
        ],
        tools: [
          {
            type: 'file_search',
            vector_store_ids: [process.env.VECTOR_STORE_ID!],
          },
        ],
      });
      return response.output_text || 'No answer';
    } catch (error) {
      console.error('AI ERROR:', error);
      return this.generateFallbackAnswer(question, age);
    }
  }

  async streamAnswer(
    question: string,
    age: number,
    firstName: string,
    conversationId: number,
    readingLevel:string,
    responseLength:string,
    learningStyle:string,
    interests:string[],
    blockedTopics:string[],
  ) {
    
    console.log('STREAM ANSWER CALLED');
    console.log("conversationId type", typeof conversationId);
    console.log("conversationId value", conversationId);
    console.log('PRISMA TEST START');
    const history = await prisma.question.findMany(
      {
      where: {
        conversationId: Number(conversationId),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 30,
    }
  );
  history.reverse();

    console.log('HISTORY LENGTH:', history.length);
    console.log(JSON.stringify(history, null, 2));
    const conv = await prisma.question.findMany({
      where:{conversationId: Number(conversationId)},
    })
    console.log('conv question ', conv)
    const messages: any[] = [];

    for (const item of history) {

      messages.push({
        role: 'user',
        content: item.question,
      });

      messages.push({
        role: 'assistant',
        content: item.answer,
      });
    }

    messages.push({
      role: 'user',
      content: question,
    });

    console.log('MESSAGES:');
    console.log(JSON.stringify(messages, null, 2));

    const stream = await this.openai.responses.stream({
      model: 'gpt-4.1-mini',

      input: [
        {
          role: 'system',
          content:`
            You are a friendly teacher for children.

            Rules:
            - Always answer according to the child's age: ${age}
            -Always answer according to the child's name:${firstName}
            - Reading level: ${readingLevel}
            - Response length: ${responseLength}
            - Learning style: ${learningStyle}
            - Interests: ${interests.join(', ')}
            - Blocked topics: ${blockedTopics.join(', ')}
            - Use very simple words for younger children
            - Use short sentences for very young children
            - Use fun examples children can understand
            - Be warm, kind, and encouraging
            - Remember information from previous messages
            - Use conversation history to answer follow-up questions
            - Never use difficult academic words without explanation
            - Adapt vocabulary to the child's level
            - Keep answers age appropriate
            - Use the preferred learning style
            - Include interests in examples when relevant
            -avoid blocked topics and steer conversation away from them
            - Keep explanations fun and engaging
            - Be warm, kind, and encouraging
            - Use conversation history for follow-up questions
            - Avoid unsafe, scary, violent, or inappropriate content
            - Never use difficult academic words without explanation

            Age behavior:
            - If age is 3-5:
              * Use extremely simple words
              * Keep answers very short
              * Use playful explanations
              * Avoid complicated details

            - If age is 6-8:
              * Use simple explanations
              * Give small examples
              * Keep answers easy and fun

            - If age is 9-12:
              * Give more detailed explanations
              * Teach simple concepts clearly
              * Encourage curiosity and learning

            - If age is 13+:
              * Give more complete and educational answers
              * Explain concepts more deeply while staying clear

            Answer naturally like a teacher talking to a child.
            `,
        },

        ...messages,
      ],
    });

    return stream;
  }

  private generateFallbackAnswer(question: string, age: number): string {
    if (age <= 6) {
      return ` Let's learn together!
    
    The answer is simple: ${question}
    
    Imagine it like a story... things happen in a fun way!
    
    Can you think about it? `;
    }

    return `🤖 Simple explanation:
    
    ${question} has a simple explanation, and we can understand it step by step.
    
    Think about it carefully, and try to answer this:
    What do you think is the reason?`;
  }

  async generateTitle(question: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content:
              'Generate a very short title (max 5 words) for this question.',
          },
          {
            role: 'user',
            content: question,
          },
        ],
      });

      return response.choices[0].message.content || 'New Chat';
    } catch (error) {
      console.error('TITLE AI ERROR:', error);

      // fallback
      return question.split(' ').slice(0, 4).join(' ');
    }
  }

  async analyzeImage(imagePath: string, age: number): Promise<string> {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Explain this image for a ${age} year old child in simple words`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
    });

    return response.choices[0].message.content || 'No image explanation';
  }

  async speechToText(audioPath: string): Promise<string> {
    const response = await this.openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'gpt-4o-transcribe',
    });

    return response.text;
  }

  async textToSpeech(text: string): Promise<string> {
    const response = await this.openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: 'alloy',
      input: text,
    });

    const fileName = `audio-${Date.now()}.mp3`;
    const filePath = `uploads/${fileName}`;

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    return fileName;
  }

  async generateImage(prompt: string): Promise<string> {
    const response = await this.openai.images.generate({
      model: 'gpt-image-1',
      prompt: `A simple, colorful educational illustration for a child: ${prompt}`,
      size: 'auto',
    });

    if (!response.data || !response.data[0]?.b64_json) {
      throw new Error('Image generation failed');
    }

    const base64 = response.data[0].b64_json;
    const buffer = Buffer.from(base64, 'base64');

    const fileName = `image-${Date.now()}.png`;
    const path = `./uploads/${fileName}`;

    fs.writeFileSync(path, buffer);

    return `/uploads/${fileName}`;
  }

  async shouldGenerateImage(question: string): Promise<boolean> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: `
              You are an assistant that decides if a child would benefit from an image.
              
              Rules:
              - Answer ONLY with JSON
              - Do NOT explain anything
              
              Return format:
              { "generateImage": true } or { "generateImage": false }
              `,
          },
          {
            role: 'user',
            content: question,
          },
        ],
      });

      const content = response.choices[0].message.content || '{}';

      const parsed = JSON.parse(content);
      return parsed.generateImage === true;
    } catch (error) {
      console.error('Image decision error:', error);
      return false;
    }
  }

  async getTokenStats(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        tokenBalance: true,
        usedTokens: true,
      },
    });

    const usages = await prisma.tokenUsage.findMany({
      where: { parentId: userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const summary = await prisma.tokenUsage.aggregate({
      where: { parentId: userId },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
      },
    });

    return {
      tokenBalance: user?.tokenBalance ?? 0,
      usedTokens: user?.usedTokens ?? 0,

      summary: {
        totalInputTokens: summary._sum.inputTokens ?? 0,
        totalOutputTokens: summary._sum.outputTokens ?? 0,
        totalTokens: summary._sum.totalTokens ?? 0,
      },

      recentUsage: usages,
    };
  }

  async generateStory(prompt: string){
    const response = await this.openai.responses.create({
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content: prompt
        }
      ]
    })
    return response.output_text
  }
}
