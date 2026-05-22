import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateStoryDto } from './Dto/create-story.dto';
import { prisma } from '@/lib/prisma';
import { AiService } from '@/ai/ai.service';
import { buildStoryPrompt } from './prompt/story.prompt';
import { UpdateStoryDto } from './Dto/update-story.dto';

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

  async generateStory(dto: CreateStoryDto, userId: number) {
    const child = await prisma.user.findFirst({
      where: { id: dto.childId , parentId: userId },

    });

    if (!child) {
      throw new NotFoundException('Child not found');
    }

    const age = child.birthDate ? this.calculateAge(child.birthDate) : 7;

    const prompt = buildStoryPrompt({
      age,
      firstName: child.firstName,
      interests: child.interests || [],
      blockedTopics: child.blockedTopics || [],

      educationalGoal: dto.educationalGoal,
      storyType: dto.storyType,
      storyLength: dto.storyLength,

      readingLevel: child.readingLevel || '',
    });

    const aiResponse = await this.aiService.generateStory(prompt);
    console.log(aiResponse);

    const parsed = JSON.parse(aiResponse);

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
    const savedScenes : any[] = [];
    for (const scene of parsed.scenes) {
      let imageUrl : string | null = null;
      if (dto.withImages && scene.imagePrompt) {
        imageUrl = await this.aiService.generateImage(scene.imagePrompt);
      }

      
      const savedScene = await prisma.storyScene.create({
        data: {
          storyId: story.id,

          sceneOrder: scene.sceneOrder,

          title: scene.title,

          content: scene.content,
          imagePrompt: scene.imagePrompt,

          imageUrl,
        },
      });
      savedScenes.push(savedScene);
    }

    let audioUrl: string | null = null;
    if (dto.withAudio) {
        const fullStoryText = `
${parsed.title}.

${parsed.content}.

${parsed.scenes
  .map(
    (scene: any) =>
      `${scene.title}. ${scene.content}`
  )
  .join(' ')}
`;
      const audioFile = await this.aiService.textToSpeech(fullStoryText);
      audioUrl = `/uploads/${audioFile}`;
      await prisma.story.update({
        where: { id: story.id },
        data: { audioUrl, hasAudio: true },
      });
    }
    return { story: {
    id: story.id,

    title: story.title,

    content: story.content,

    audioUrl: audioUrl,
  }, scenes: savedScenes };
  }

  async getMyStories(userId: number){
    const stories = await prisma.story.findMany({
        where:{childId: userId},
        orderBy:{createdAt: 'desc'},
        include: {scenes:{
            orderBy:{
                sceneOrder: 'asc'
            }
        }}
    }) 

    return stories.map((story) => ({
    id: story.id,

    title: story.title,

    content: story.content,

    audioUrl: story.audioUrl,

    scenes: story.scenes.map((scene) => ({
      id: scene.id,

      sceneOrder: scene.sceneOrder,

      title: scene.title,

      content: scene.content,

      imageUrl: scene.imageUrl,
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
        }}
    })

    return stories.map((story) => ({
    id: story.id,

    title: story.title,

    content: story.content,

    audioUrl: story.audioUrl,

    scenes: story.scenes.map((scene) => ({
      id: scene.id,

      sceneOrder: scene.sceneOrder,

      title: scene.title,

      content: scene.content,

      imageUrl: scene.imageUrl,
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
            content:dto.content
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
    },

    scenes: updatedScenes,
  };
  }
}
