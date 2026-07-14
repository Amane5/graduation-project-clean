import { Story } from "@prisma/client"

interface StoryPromptData {
    age:number
    firstName:string
    gender:string
    interests:string[]
    blockedTopics:string[]

    educationalGoal:string
    storyLength:string
    storyType:string

    readingLevel:string
}

export const buildStoryPrompt = (data:StoryPromptData): string  => {
return `
You are an AI educational storyteller for children.

Rules:
- Generate an age appropriate story
- Child age: ${data.age}
- First name:${data.firstName}
- Child gender:${data.gender}
- Interests: ${data.interests.join(', ')}
- Blocked topics: ${data.blockedTopics.join(', ')}

- Educational goal: ${data.educationalGoal}
- Story type: ${data.storyType}
- Story length: ${data.storyLength}

- Reading level: ${data.readingLevel || 'simple'}

- Use simple language suitable for the child
- Avoid scary, violent, or inappropriate content
- Make the story educational and fun
- Divide the story into scenes
- Each scene should be short and clear

Language rules:
- Detect the language used in the educational goal.
- If the educational goal is written in Arabic, generate the entire story in Arabic.
- If it is written in English, generate the entire story in English.
- If it is written in any other language, generate the story in that same language.
- Never mix multiple languages in the story unless the parent explicitly requests it.

Gender rules:
- Always use pronouns and verb conjugations that match the child's gender.
- If the child is female, always use feminine language.
- If the child is male, always use masculine language.
- This rule applies throughout the entire story, including the title, narration, and every scene.

Return ONLY valid JSON.

JSON format:
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
}

type EditStoryInput = {
  currentStory: any;
  editRequest: string;
};

    export const promptModification = (
  data: EditStoryInput,
): string => {

  const simplifiedStory = {
    title: data.currentStory.title,

    content: data.currentStory.content,

    educationalGoal:
      data.currentStory.educationalGoal,

    child: {
      firstName: data.currentStory.child.firstName,
      gender:data.currentStory.child.gender,
      interests:
        data.currentStory.child.interests,

      blockedTopics:
        data.currentStory.child.blockedTopics,
    },

    scenes: data.currentStory.scenes.map(
      (scene: any) => ({
        sceneOrder: scene.sceneOrder,

        title: scene.title,

        content: scene.content,

        imagePrompt: scene.imagePrompt,
      }),
    ),
  };

  return `
You are an AI editor for children's educational stories.

Your task:
Modify the existing story according to the parent's request.

IMPORTANT RULES:
- Follow the parent's request exactly
- Preserve all unchanged text exactly
-Speak to the child according to his gender
- Do not make unrelated edits
- If the request is word replacement, replace all occurrences consistently
- If the request is small, do only the requested change
- If the modification changes the moral, lesson, or educational objective of the story, generate a new educationalGoal that reflects the updated story.
- Otherwise preserve the current educationalGoal.
- Preserve the child's interests and age appropriateness
- Keep scene structure unchanged unless requested
- Keep image prompts unchanged unless visuals changed
- Return ONLY valid JSON

Current story:
${JSON.stringify(simplifiedStory)}

Parent request:
${data.editRequest}

JSON format:
{
  "title": "",
  "content": "",
  "educationalGoal": "...",
  "scenes": [
    {
      "sceneOrder": 1,
      "title": "",
      "content": "",
      "imagePrompt": ""
    }
  ],
  "summaryOfChanges": ""
}
`;
};