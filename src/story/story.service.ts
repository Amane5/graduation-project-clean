import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateStoryDto } from './Dto/create-story.dto';
import { prisma } from '@/lib/prisma';
import { AiService } from '@/ai/ai.service';
import { promptModification, buildStoryPrompt } from './prompt/story.prompt';
import { UpdateStoryDto } from './Dto/update-story.dto';
import * as path from "path";

@Injectable()
export class StoryService {
  constructor(private readonly aiService: AiService) {}

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

//   async generateStory(dto: CreateStoryDto, userId: number) {
//     const child = await prisma.user.findFirst({
//       where: { id: dto.childId , parentId: userId },
//     });

//     if (!child) {
//       throw new NotFoundException('Child not found');
//     }

//     const age = child.birthDate ? this.calculateAge(child.birthDate) : 7;

//     const prompt = buildStoryPrompt({
//       age,
//       firstName: child.firstName,
//       gender:child.gender || 'unspecified',
//       interests: child.interests || [],
//       blockedTopics: child.blockedTopics || [],

//       educationalGoal: dto.educationalGoal,
//       storyType: dto.storyType,
//       storyLength: dto.storyLength,

//       readingLevel: child.readingLevel || '',
//     });

//     const aiResponse = await this.aiService.generateStory(prompt);
//     console.log(aiResponse);

//     const cleaned = aiResponse
//   .replace(/```json/g, "")
//   .replace(/```/g, "")
//   .trim();
//     const parsed = JSON.parse(cleaned);

//     const story = await prisma.story.create({
//       data: {
//         title: parsed.title,
//         content: parsed.content,

//         educationalGoal: dto.educationalGoal,
//         storyType: dto.storyType,
//         storyLength: dto.storyLength,

//         hasImages: dto.withImages,
//         hasAudio: dto.withAudio,

//         childId: dto.childId,
//       },
//     });
//     const savedScenes : any[] = [];
//     for (const scene of parsed.scenes) {
//       let imageUrl : string | null = null;
//       if (dto.withImages && scene.imagePrompt) {
//         imageUrl = await this.aiService.generateImage(scene.imagePrompt);
//       }

      
//       const savedScene = await prisma.storyScene.create({
//         data: {
//           storyId: story.id,

//           sceneOrder: scene.sceneOrder,

//           title: scene.title,

//           content: scene.content,
//           imagePrompt: scene.imagePrompt,

//           imageUrl,
//         },
//       });
//       savedScenes.push(savedScene);
//     }

//     let audioUrl: string | null = null;
//     if (dto.withAudio) {
//         const fullStoryText = `
// ${parsed.title}.

// ${parsed.content}.

// ${parsed.scenes
//   .map(
//     (scene: any) =>
//       `${scene.title}. ${scene.content}`
//   )
//   .join(' ')}
// `;
//       const audioFile = await this.aiService.textToSpeech(fullStoryText);
//       audioUrl = `/uploads/${audioFile}`;
//       await prisma.story.update({
//         where: { id: story.id },
//         data: { audioUrl, hasAudio: true },
//       });
//     }
//     return { story: {
//     id: story.id,
//     childId:story.childId,
//     title: story.title,
//     status:story.status,
//     content: story.content,
//     audioUrl: audioUrl,
//   }, scenes: savedScenes };
//   }

    async generateStory(dto: CreateStoryDto, userId: number) {
    const child = await prisma.user.findFirst({
        where: { id: dto.childId, parentId: userId },
    });

    if (!child) {
        throw new NotFoundException('Child not found');
    }

    const age = child.birthDate ? this.calculateAge(child.birthDate) : 7;

    const prompt = buildStoryPrompt({
        age,
        firstName: child.firstName,
        gender: child.gender || 'unspecified',
        interests: child.interests || [],
        blockedTopics: child.blockedTopics || [],
        educationalGoal: dto.educationalGoal,
        storyType: dto.storyType,
        storyLength: dto.storyLength,
        readingLevel: child.readingLevel || '',
    });

console.log("STEP 1");
    const aiResponse = await this.aiService.generateStory(prompt);

    const cleaned = aiResponse
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

    const parsed = JSON.parse(cleaned);

    // 1. create story first
    const story = await prisma.story.create({
        data: {
        title: parsed.title,
        content: parsed.content,
        educationalGoal: dto.educationalGoal,
        storyType: dto.storyType,
        storyLength: dto.storyLength,
        hasImages: dto.withImages,
        hasAudio: dto.withAudio,
        childId: dto.childId,
        },
    });
console.log(
  "STORY SAVED",
  story.id
);
    // -------------------------
    // 2. AUDIO + TRANSCRIPT + TIMELINE (BEFORE SCENES LOOP)
    // -------------------------

    let audioUrl: string | null = null;
    let timelineData: any = null;

    if (dto.withAudio) {
        const fullStoryText = `
    ${parsed.title}

    ${parsed.content}

    ${parsed.scenes
    .map((scene: any) => `${scene.title}. ${scene.content}`)
    .join(' ')}
    `;

    console.log("STEP 2");

        const audioFile = await this.aiService.textToSpeech(fullStoryText);
        const fullAudioPath = path.join(
        process.cwd(),
        "uploads",
        audioFile,
        );

console.log("FULL AUDIO PATH", fullAudioPath);

console.log("STEP 3");

const transcript =
  await this.aiService.speechToText(fullAudioPath);
        audioUrl = `/uploads/${audioFile}`;

        await prisma.story.update({
        where: { id: story.id },
        data: { audioUrl, hasAudio: true },
        });

        // IMPORTANT: pass file path correctly
        // const transcript = await this.aiService.speechToText(audioUrl);

        console.log("STEP 4");

        timelineData = await this.aiService.generateSceneTimeline(
        parsed.scenes,
        transcript,
        );
        console.log("STEP 5");
        console.log("TRANSCRIPT", transcript);

        console.log(
        "TIMELINE",
        JSON.stringify(timelineData, null, 2)
        );

    }

    // -------------------------
    // 3. SAVE SCENES (NOW SAFE)
    // -------------------------

    const savedScenes: any[] = [];
        console.log(
        JSON.stringify(
            timelineData,
            null,
            2
        )
        );
    for (const scene of parsed.scenes) {
        let imageUrl: string | null = null;

        if (dto.withImages && scene.imagePrompt) {
        imageUrl = await this.aiService.generateImage(scene.imagePrompt);
        }

        const timeline = timelineData?.timeline?.find(
        (t) => t.sceneOrder === scene.sceneOrder,
        );

        const savedScene = await prisma.storyScene.create({
        data: {
            storyId: story.id,
            sceneOrder: scene.sceneOrder,
            title: scene.title,
            content: scene.content,
            imagePrompt: scene.imagePrompt,
            imageUrl,

            startTime: timeline?.start ?? 0,
            endTime: timeline?.end ?? 5,
        },
        });

        savedScenes.push(savedScene);
    }

    // -------------------------
    // 4. RETURN
    // -------------------------

    return {
        story: {
        id: story.id,
        childId: story.childId,
        title: story.title,
        status: story.status,
        content: story.content,
        audioUrl,
        },
        scenes: savedScenes,
    };
    }

  async getMyStories(userId: number){
    const stories = await prisma.story.findMany({
        where:{childId: userId, status:'PUBLISHED'},
        orderBy:{createdAt: 'desc'},
        include: {scenes:{
            orderBy:{
                sceneOrder: 'asc'
            }
        },
        questions:true
    }
    }) 

    return stories.map((story) => ({
    id: story.id,

    title: story.title,

    content: story.content,

    audioUrl: story.audioUrl,
    status:story.status,
     questions: story.questions.map((q) => ({
        id: q.id,
        question: q.question,
    })),
    scenes: story.scenes.map((scene) => ({
      id: scene.id,

      sceneOrder: scene.sceneOrder,

      title: scene.title,

      content: scene.content,

      imageUrl: scene.imageUrl,

      startTime: scene.startTime,
        endTime: scene.endTime,
    })),
  }));
  }

  async getChildStories(parentId:number , childId:number){
    const child = await prisma.user.findFirst({
        where:{id:childId , parentId: parentId}
    })

    if(!child){
        throw new ForbiddenException('Unathorized child')
    }

    const stories = await prisma.story.findMany({
        where:{childId:childId},
        orderBy:{createdAt:'desc'},
        // select:{
        //     id:true,
        //     title:true,
        //     content:true,
        //     audioUrl:true,
        //     createdAt:true
        // },
        include: {scenes:{
            orderBy:{
                sceneOrder: 'asc'
            }
        },
        questions:true
    }
    })

    return stories.map((story) => ({
    id: story.id,

    childId:story.childId,

    title: story.title,

    content: story.content,

    audioUrl: story.audioUrl,

    status:story.status,
    questions: story.questions.map((q) => ({
    id: q.id,
    question: q.question,
  })),
    scenes: story.scenes.map((scene) => ({
      id: scene.id,

      sceneOrder: scene.sceneOrder,

      title: scene.title,

      content: scene.content,

      imageUrl: scene.imageUrl,

      startTime: scene.startTime,
  endTime: scene.endTime,
    })),
  }));
  }

  async updateStory(parentId:number , dto : UpdateStoryDto , storyId:number ){
    //get story
    const story = await prisma.story.findFirst({
        where:{id : storyId},
        include:{child: true}
    })

    if(!story){
        throw new NotFoundException('Story not found')
    }

    if(story.child.parentId !== parentId){
        throw new ForbiddenException('Unathroized')
    }

    //update main story
    await prisma.story.update({
        where:{id: storyId},
        data:{
            title:dto.title,
            content:dto.content,

            status: "DRAFT",
            isApproved: false,
            questionsApproved: false,
        }
    })

    //update scenes
    for(const scene of dto.scenes){
        await prisma.storyScene.update({
            where:{id:scene.id},
            data:{
                title:scene.title,
                content:scene.content
            }
        })
    }

    //get updated scenes
    const updatedScenes = await prisma.storyScene.findMany({
        where:{storyId: storyId},
        orderBy:{
            sceneOrder:'asc'
        }
    })

    let audioUrl = story.audioUrl;

    
    if(story.hasAudio){
        const fullStoryText = `
        ${dto.title || story.title}.

        ${dto.content || story.content}.

        ${updatedScenes
        .map(
            (scene) =>
            `${scene.title}. ${scene.content}`
        )
        .join(' ')}
        `;
        const audioFile = await this.aiService.textToSpeech(fullStoryText)
        const audioUrl = `/uploads/${audioFile}`;
        await prisma.story.update({
        where: {
            id: storyId,
        },

        data: {
            audioUrl,
        },
        });
    }

    //final updated story
    const updatedStory =
    await prisma.story.findUnique({
      where: {
        id: storyId,
      },
    });
    
    return {
    story: {
      id: updatedStory?.id,

      title: updatedStory?.title,

      content: updatedStory?.content,

      audioUrl: updatedStory?.audioUrl,
      status: "DRAFT",
      isApproved: false,
      questionsApproved: false
    },

    scenes: updatedScenes,
  };
  }

    async approveStory(parentId:number , storyId:number){

        const story = await prisma.story.findFirst({
            where:{id:storyId},
            include:{child:true}
        })

        if(!story){
            throw new NotFoundException('Story not found')
        }

        if(story.child.parentId !== parentId){
            throw new ForbiddenException('Unauthorized')
        }

        const updatedStory = await prisma.story.update({
            where:{id:storyId},
            data:{
                isApproved: true,
            }
        })

        return updatedStory
    }

    async updateStoryWithAi(parentId:number, editRequest:string , storyId:number){
        const currentStory = await prisma.story.findUnique({
            where:{id:storyId},
            include:{
                scenes: {
                    orderBy: {
                        sceneOrder: 'asc',
                    },
                },
                child:true
            }
        })

        if(!currentStory){
            throw new NotFoundException('Story not found')
        }

        if(currentStory.child.parentId !== parentId){
            throw new ForbiddenException('Unauthorized')
        }

        const prompt = promptModification({
            currentStory,
            editRequest
        })

        await prisma.storyEditMessage.create({
            data:{
                storyId,
                role:"user",
                content:editRequest
            }
        })

        const aiResponse = await this.aiService.editStory(prompt)
        const cleaned = aiResponse
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
        let parsed
        try{
            parsed = JSON.parse(cleaned);
        }catch{
            throw new BadRequestException('Invalid AI response')
        }

        const storyTextChanged =
        JSON.stringify(
            parsed.scenes.map((s:any)=>({
                title:s.title,
                content:s.content
            }))
        ) !==
        JSON.stringify(
            currentStory.scenes.map((s)=>({
                title:s.title,
                content:s.content
            }))
        )
        ||
        parsed.title !== currentStory.title
        ||
        parsed.content !== currentStory.content;

        await prisma.storyEditMessage.create({
                data:{
                    storyId,
                    role:"assistant",
                    content:parsed.summaryOfChanges || "story updated"
                }
        })
        await prisma.story.update({
            where: { id: storyId },

            data: {
            title: parsed.title,

            content: parsed.content,

            status: "DRAFT",
            isApproved: false,
            questionsApproved: false,
            },
        });

        await prisma.storyScene.deleteMany({
            where:{storyId}
        })

        const savedScenes: any[] = [];

        for (const newScene of parsed.scenes) {

        const oldScene =
        currentStory.scenes.find(
            (s) =>
            s.sceneOrder ===
            newScene.sceneOrder,
        );

        let imageUrl: string | null =
        oldScene?.imageUrl || null;

        // generate image ONLY if prompt changed
        const imagePromptChanged =
        oldScene?.imagePrompt !==
        newScene.imagePrompt;

        if (
        currentStory.hasImages &&
        imagePromptChanged &&
        newScene.imagePrompt
        ) {
        imageUrl =
            await this.aiService.generateImage(
            newScene.imagePrompt,
            );
        }

        const savedScene =
        await prisma.storyScene.create({
            data: {
            storyId,

            sceneOrder:
                newScene.sceneOrder,

            title: newScene.title,

            content: newScene.content,

            imagePrompt:
                newScene.imagePrompt,

            imageUrl,
            },
        });

        savedScenes.push(savedScene);
        }

    let updatedAudioUrl =
        currentStory.audioUrl;

    // regenerate audio ONLY if text changed
        if (currentStory.hasAudio && storyTextChanged) {

            const fullStoryText = `
            ${parsed.title}

            ${parsed.content}

            ${parsed.scenes
            .map(
                (scene: any) =>
                `${scene.title}. ${scene.content}`,
            )
            .join(' ')}
            `;

            const audioFile =
            await this.aiService.textToSpeech(
                fullStoryText,
            );

            updatedAudioUrl =
            `/uploads/${audioFile}`;

            await prisma.story.update({
            where: { id: storyId },

            data: {
                audioUrl: updatedAudioUrl,
            },
            });
        }

    return {
        story: {
        id: storyId,

        title: parsed.title,

        content: parsed.content,

        audioUrl: updatedAudioUrl,
        status: "DRAFT",
        isApproved: false,
        questionsApproved: false
        },

        scenes: savedScenes,

        summaryOfChanges:
        parsed.summaryOfChanges,
    }
}

    async getAllChildrenStories(parentId: number) {

    const stories = await prisma.story.findMany({

      where: {
        child: {
          parentId: parentId,
        },
      },

      include: {

        child: {
          select: {
            id: true,

            firstName: true,
          },
        },

        scenes: {
          orderBy: {
            sceneOrder: 'asc',
          },
        },
        questions:true
      },

      orderBy: {
        createdAt: 'desc',
      },
    });

  return stories.map((story) => ({
    id: story.id,

    title: story.title,

    content: story.content,

    audioUrl: story.audioUrl,

    status: story.status,

    child: {
      id: story.child.id,

      firstName:
        story.child.firstName,
    },

    scenes: story.scenes.map(
      (scene) => ({
        id: scene.id,

        sceneOrder:
          scene.sceneOrder,

        title: scene.title,

        content: scene.content,

        imageUrl:
          scene.imageUrl,
      }),
    ),
    questions:story.questions
  }));
    }

    async deleteStory(storyId:number, parentId:number){
        const story = await prisma.story.findFirst({
            where:{id:storyId , child:{
                parentId:parentId
            }}
        })

        if(!story){
            throw new NotFoundException('Story not found')
        }

        await prisma.story.delete({
            where:{id:storyId}
        })

        return { message : 'Story deleted successfully'}
    }

    async getEditMessages(parentId:number, storyId:number){
        const story = await prisma.story.findUnique({
            where:{id:storyId},
            include:{
                child:true
            }
        })

        if(!story){
            throw new NotFoundException('Story not found')
        }

        if(story.child.parentId !== parentId){
            throw new ForbiddenException('Unauthorized')
        }

        return prisma.storyEditMessage.findMany({
            where:{storyId},
            orderBy:{createdAt:'asc'}
        })
    }
}