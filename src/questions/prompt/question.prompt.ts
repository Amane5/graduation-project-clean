export const buildQuestionsPrompt = (
  story: any,
) => {
  return `
You are an educational assistant.

Generate exactly 3 questions based on this story.

Requirements:

- Questions must help check child's understanding.
- Questions must be short.
- Questions must be suitable for children.
- Return ONLY valid JSON.

Format:

{
  "questions": [
    {
      "question": "..."
    }
  ]
}

Story Title:
${story.title}

Story Summary:
${story.content}

Scenes:
${story.scenes
  .map(
    (scene: any) =>
      `${scene.title}: ${scene.content}`,
  )
  .join('\n')}
`;
};