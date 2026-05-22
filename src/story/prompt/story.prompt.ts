interface StoryPromptData {
    age:number
    firstName:string
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