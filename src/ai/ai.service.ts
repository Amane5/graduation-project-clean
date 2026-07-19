import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import * as fs from 'fs';
import { prisma } from '@/lib/prisma';
// import ffmpeg from "fluent-ffmpeg";
// import ffmpegPath from "ffmpeg-static";
import { parseFile } from "music-metadata";
import ffmpeg from "fluent-ffmpeg";
import { toFile } from "openai/uploads";
// import ffprobe from "ffprobe-static";

// ffmpeg.setFfmpegPath(ffmpegPath as string);
// ffmpeg.setFfprobePath(ffprobe.path);
ffmpeg.setFfmpegPath(
  "D:\\ffmpeg\\ffmpeg-8.1.1-essentials_build\\bin\\ffmpeg.exe"
);

ffmpeg.setFfprobePath(
  "D:\\ffmpeg\\ffmpeg-8.1.1-essentials_build\\bin\\ffprobe.exe"
);

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 120000,
    });
  }

  async generateAnswer(
    childId: number,
    question: string,
    age: number,
  ): Promise<string> {
    try {
      const child = await prisma.user.findUnique({
        where: {
          id: childId,
        },
      });
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
            vector_store_ids: [child?.vectorStoreId || ''],
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
    childId: number,
    question: string,
    age: number,
    firstName: string,
    conversationId: number,
    readingLevel: string,
    responseLength: string,
    learningStyle: string,
    interests: string[],
    gender: string,
    blockedTopics: string[],
    mode: string,
  ) {
    console.log('STREAM ANSWER CALLED');
    console.log('conversationId type', typeof conversationId);
    console.log('conversationId value', conversationId);
    console.log('PRISMA TEST START');
    const child = await prisma.user.findUnique({
      where: {
        id: childId,
      },
    });
    const history = await prisma.question.findMany({
      where: {
        conversationId: Number(conversationId),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 30,
    });
    history.reverse();

    console.log('HISTORY LENGTH:', history.length);
    console.log(JSON.stringify(history, null, 2));
    const conv = await prisma.question.findMany({
      where: { conversationId: Number(conversationId) },
    });
    console.log('conv question ', conv);
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
    console.log('VECTOR STORE:', child?.vectorStoreId);
    const documentContext = await this.buildDocumentContext(
      child?.vectorStoreId,
      question,
    );
    const systemPrompt = mode === 'journey'
    ? this.buildJourneyPrompt(
        age,
        firstName,
        gender,
        readingLevel,
        responseLength,
        learningStyle,
        interests,
        blockedTopics,
      )
    : this.buildNormalPrompt(
        age,
        firstName,
        gender,
        readingLevel,
        responseLength,
        learningStyle,
        interests,
        blockedTopics,
      );

console.log('MODE:', mode);
console.log('SYSTEM PROMPT:');
console.log(systemPrompt);
    const stream = await this.openai.responses.stream({
      model: 'gpt-4.1',
      input: [
        {
          role: 'system',
          content: 
          systemPrompt
          // `
          //   You are a friendly teacher for children.

          //   Rules:
          //   - Always answer according to the child's age: ${age}
          //   -Always answer according to the child's name:${firstName}
          //   -Always answer according to the child's gender :${gender}
          //   - Reading level: ${readingLevel}
          //   - Response length: ${responseLength}
          //   - Learning style: ${learningStyle}
          //   - Interests: ${interests.join(', ')}
          //   - Blocked topics: ${blockedTopics.join(', ')}
          //   - Use very simple words for younger children
          //   - Use short sentences for very young children
          //   - Use fun examples children can understand
          //   - Be warm, kind, and encouraging
          //   - Remember information from previous messages
          //   - Use conversation history to answer follow-up questions
          //   - Never use difficult academic words without explanation
          //   - Adapt vocabulary to the child's level
          //   - Keep answers age appropriate
          //   - Use the preferred learning style
          //   - Include interests in examples when relevant
          //   -avoid blocked topics and steer conversation away from them
          //   - Keep explanations fun and engaging
          //   - Be warm, kind, and encouraging
          //   - Use conversation history for follow-up questions
          //   - Avoid unsafe, scary, violent, or inappropriate content
          //   - Never use difficult academic words without explanation
          //   - IMPORTANT:
          //     If the answer exists in the uploaded knowledge files,
          //     you MUST use that information in your answer.
          //   Age behavior:
          //   - If age is 3-5:
          //     * Use extremely simple words
          //     * Keep answers very short
          //     * Use playful explanations
          //     * Avoid complicated details

          //   - If age is 6-8:
          //     * Use simple explanations
          //     * Give small examples
          //     * Keep answers easy and fun

          //   - If age is 9-12:
          //     * Give more detailed explanations
          //     * Teach simple concepts clearly
          //     * Encourage curiosity and learning

          //   - If age is 13+:
          //     * Give more complete and educational answers
          //     * Explain concepts more deeply while staying clear

          //   Answer naturally like a teacher talking to a child.
          //   `,
        },
        ...(documentContext
          ? [
              {
                role: 'system' as const,
                content: `Use this uploaded knowledge context when it is relevant. If the answer exists in this context, use it.\n\n${documentContext}`,
              },
            ]
          : []),

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

  async speechToText(audioBuffer: Buffer) {

    const file = await toFile(
      audioBuffer,
      "answer.webm"
    );

    const transcription =
      await this.openai.audio.transcriptions.create({
        file,
        model: "gpt-4o-mini-transcribe",
      });

    return transcription.text;
  }
  
  async textToSpeechChat(text: string): Promise<string> {
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

  async textToSpeech(text: string) {
    const response =
      await this.openai.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: "fable",
        input: text,
        instructions: `
        Read this as a warm children's storyteller.

        Speak slowly.
        Use an expressive and playful tone.
        Sound gentle, cheerful, and engaging.
        Pause naturally between sentences.
        Emphasize exciting moments with enthusiasm.
        Speak as if reading a bedtime story to a young child.
        `,
      });

    const fileName = `audio-${Date.now()}.mp3`;

    const filePath = `uploads/${fileName}`;

    const buffer = Buffer.from(await response.arrayBuffer());

    fs.writeFileSync(filePath, buffer);

    const metadata = await parseFile(filePath);

    return {
      fileName,
      filePath,
      duration: metadata.format.duration || 0,
    };
  }

  async mergeAudioFiles(files: string[]): Promise<string> {
console.log("MERGING FILES");
console.log(files);

console.log("FFMPEG PATH");
console.log("D:\\ffmpeg\\ffmpeg-8.1.1-essentials_build\\bin\\ffmpeg.exe");

console.log("FFPROBE PATH");
console.log("D:\\ffmpeg\\ffmpeg-8.1.1-essentials_build\\bin\\ffprobe.exe");
  return new Promise((resolve, reject) => {

    const outputFile = `story-${Date.now()}.mp3`;

    const outputPath = `uploads/${outputFile}`;

    const command = ffmpeg();

    files.forEach(file => {
      command.input(file);
    });
            console.log("OUTPUT PATH", outputPath)

    command.on("end", () => {
        resolve(`/uploads/${outputFile}`);
      })

      .on("error", reject)
      .mergeToFile(outputPath);
  });
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

  async generateStory(prompt: string) {
    const response = await this.openai.responses.create({
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content: prompt,
        },
      ],
    });
    return response.output_text;
  }

  async editStory(prompt: string) {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4.1-mini',

      messages: [
        {
          role: 'system',
          content: 'You are an AI editor for children educational stories.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],

      temperature: 0.7,
    });

    return response.choices[0].message.content || '';
  }

  async generateSceneTimeline(
  scenes: { sceneOrder: number; title: string; content: string }[],
  transcript: string,
) {
  const response = await this.openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: `
You are a timing alignment engine.

You will receive:
1. A list of story scenes
2. A full narration transcript of an audio file

Your task:
- Split the transcript into sections matching each scene
- Estimate startTime and endTime in seconds
- Ensure order is preserved
- Total time must be realistic

Return ONLY valid JSON:

{
  "timeline": [
    { "sceneOrder": 1, "start": 0, "end": 5 },
    { "sceneOrder": 2, "start": 5, "end": 12 }
  ]
}
        `,
      },
      {
        role: "user",
        content: JSON.stringify({
          scenes,
          transcript,
        }),
      },
    ],
  });

  const content = response.choices[0].message.content || "{}";

const cleaned = content
  .replace(/```json/g, "")
  .replace(/```/g, "")
  .trim();

return JSON.parse(cleaned);
  }

    async generateQuestions(prompt: string) {
    const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',

        messages: [
        {
          role: 'system',
          content: `
          You generate educational questions for children.
          Always return valid JSON.
          Never return explanations.
          `,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],

        temperature: 0.7,
      });

    return response.choices[0].message.content;
  }

  async generateExpectedAnswer(prompt: string) {
  const response = await this.openai.chat.completions.create({
    model: 'gpt-4o-mini',

    messages: [
      {
        role: 'system',
        content: `
You generate expected answers for children's story questions.

Always return valid JSON.

Return format:

{
  "expectedAnswer": "..."
}
        `,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],

    temperature: 0.3,
  });

  return response.choices[0].message.content;
  }

  async evaluateAnswers(prompt: string) {
    const response =
      await this.openai.chat.completions.create({
        model: "gpt-4o-mini",

        messages: [
          {
            role: "system",
            content: `
            You evaluate children's answers.

            Always return valid JSON.
            Never return explanations outside JSON.
            `,
          },
          {
            role: "user",
            content: prompt,
          },
        ],

        temperature: 0.3,
      });

    return response.choices[0].message.content;
  }

  private buildJourneyPrompt(
  age: number,
  firstName: string,
  gender: string,
  readingLevel: string,
  responseLength: string,
  learningStyle: string,
  interests: string[],
  blockedTopics: string[],
) {
  return `
You are creating an educational exploration journey for children.

Child profile:

Age: ${age}
Name: ${firstName}
Gender: ${gender}
Reading Level: ${readingLevel}
Response Length: ${responseLength}
Learning Style: ${learningStyle}
Interests: ${interests.join(', ')}
Blocked Topics: ${blockedTopics.join(', ')}

IMPORTANT OUTPUT FORMAT

You MUST answer using EXACTLY this structure:

[[TITLE]]
actual title

[[INTRODUCTION]]
actual introduction

[[STORY]]
actual story

[[EXPLANATION]]
actual explanation

[[FACTS]]
- fact 1
- fact 2
- fact 3

[[CHALLENGE]]
actual challenge

[[QUESTIONS]]
- question 1
- question 2
- question 3

[[IMAGE_PROMPT]]
actual image prompt

Do not add any text before [[TITLE]]
Do not add any text after [[IMAGE_PROMPT]]

[[IMAGE_PROMPT]]

A detailed educational illustration prompt.

Rules:

- Adapt every section to age ${age}
- Use simple language for younger children
- Use richer explanations for older children
- Keep all sections present
- Never skip any section
- Use interests when relevant
- Avoid blocked topics
- Keep the tone warm and exciting
`;
}

  private async buildDocumentContext(
    vectorStoreId: string | null | undefined,
    question: string,
  ): Promise<string | null> {
    if (!vectorStoreId) {
      return null;
    }

    try {
      const searchResults = await this.openai.vectorStores.search(
        vectorStoreId,
        {
          query: question,
          max_num_results: 5,
        },
      );

      const snippets = searchResults.data
        .map((result, index) => {
          const text = result.content
            .filter((item) => item.type === 'text')
            .map((item) => item.text.trim())
            .filter(Boolean)
            .join('\n');

          if (!text) {
            return null;
          }

          return `Document ${index + 1}:\n${text}`;
        })
        .filter((snippet): snippet is string => Boolean(snippet));

      if (!snippets.length) {
        return null;
      }

      return snippets.join('\n\n');
    } catch (error) {
      console.error('VECTOR SEARCH ERROR:', error);
      return null;
    }
  }
  
  private buildNormalPrompt(
  age: number,
  firstName: string,
  gender: string,
  readingLevel: string,
  responseLength: string,
  learningStyle: string,
  interests: string[],
  blockedTopics: string[],
) {
  return `
  You are a friendly teacher for children.

  Rules:
  - Always answer according to the child's age: ${age}
  -Always answer according to the child's name:${firstName}
  -Always answer according to the child's gender :${gender}
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
  - IMPORTANT:
    If the answer exists in the uploaded knowledge files,
    you MUST use that information in your answer.
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
`
}

async questionTextToSpeech(text: string) {
  const response = await this.openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: text,
  });

  const fileName = `question-${Date.now()}.mp3`;
  const filePath = `uploads/${fileName}`;

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  const metadata = await parseFile(filePath);

  return {
    fileName,
    filePath,
    duration: metadata.format.duration || 0,
  };
}

async classifyAnalytics(question: string, answer: string) {
  return this.openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content: `
        You are a STRICT child learning analytics engine.

        RULES:
        - DO NOT guess
        - DO NOT hallucinate
        - If data is insufficient → return empty values
        - Only extract observable signals

        emotionalSignal:

        Allowed values only:

        happy
        curious
        excited
        frustrated
        confused
        sad
        anxious
        neutral

        If not enough evidence:
        return empty string

        Return ONLY valid JSON:

        {
        "category": "",
        "subcategory": "",
        "curiosityScore": 0,
        "creativityScore": 0,
        "analyticalScore": 0,
        "emotionalSignal": "",
        "skills": []
        }
            `,
      },
      {
        role: 'user',
        content: `Question: ${question}\nAnswer: ${answer}`,
      },
    ],
  });
}

async generateRecommendations(report: any): Promise<string[]> {
  const response = await this.openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content: `
You are a parenting expert.

RULES:
- Use ONLY provided data
- Do NOT guess
- If data is insufficient, return empty arrays
- Be practical and actionable

Return ONLY JSON:

{
  "strengths": [],
  "recommendations": [],
  "activities": [],
  "warnings": []
}
        `,
      },
      {
        role: 'user',
        content: JSON.stringify(report),
      },
    ],
  });

  const content =
    response.choices[0].message.content;

  if (!content) {
    return [];
  }

  try {
    const parsed = JSON.parse(content);

    return parsed.recommendations || [];
  } catch {
    return [];
  }
}

async askAnalytics(prompt: string) {
  const response =
    await this.openai.chat.completions.create({
      model: 'gpt-4.1-mini',

      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

  return (
    response.choices[0]
      .message.content || ''
  );
}

async askVisionModel(
  imageUrl: string,
  prompt: string,
): Promise<any> {

  const response = await this.openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
            },
          },
        ],
      },
    ],
    response_format: {
      type: "json_object",
    },
  });

  return JSON.parse(
    response.choices[0].message.content || "{}",
  );
}

async chat(prompt: string): Promise<any> {

  const response =
    await this.openai.chat.completions.create({

      model: "gpt-4.1-mini",

      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],

      response_format: {
        type: "json_object",
      },
    });

  return JSON.parse(
    response.choices[0].message.content || "{}",
  );
}

async analyzeDrawing(imageUrl: string) {

    const prompt = `
You are an expert children's storytelling assistant.

Your task is:

1. Carefully analyze the child's drawing.

2. Identify:
- characters
- objects
- places
- emotions
- important visual elements

3. Write a structured analysis that will later be used to generate a story.

Return ONLY valid JSON.

{
    "summary":"...",
    "objects":[...],
    "characters":[...],
    "places":[...],
    "style":"..."
}
`;

    return this.askVisionModel(
        imageUrl,
        prompt,
    );
}

async generateDrawingInterview(drawingAnalysis: any) {

const prompt = `
You are a creative children's story interviewer.

The goal is to collect information about the DRAWING, not about the user.

The drawing has already been analyzed.

Drawing analysis:

${JSON.stringify(drawingAnalysis)}

Now start a friendly interview.

Rules:

- Start with a warm compliment.

- Do NOT explain the analysis.

- The question must be about the drawing or the characters inside the drawing.

- Do not ask about the user or their family.
- Never say:
  - your child
  - your son
  - your daughter
  - you as a parent
- Treat the characters in the drawing as story characters.
- Ask questions that help build a story.
Examples:

Good:
- What is the boy in the picture thinking?
- What happens after the soccer game?
- Where is the little girl going next?
- Why is the dragon smiling?
- What adventure happens after this scene?

Bad:
- What does your child want?
- What do you want your child to do?
- Tell me about your son.
- How does your daughter feel?

- Ask ONE question only.

- The question must help build a future story.

Return ONLY JSON.

{
    "reply":"...",
    "finished":false
}
`;

return this.chat(prompt);
}

async chatStrict(prompt: string) {
  const response = await this.openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      { role: 'user', content: prompt }
    ],
  });

  const content = response.choices[0].message.content;

console.log(content);

return JSON.parse(content || "{}");
}
}
