export const buildExpectedAnswerPrompt = (
  storyContent: string,
  question: string,
) => `
You are evaluating a child story.

Story:
${storyContent}

Question:
${question}

Generate the ideal expected answer.

Return only JSON:

{
  "expectedAnswer": "..."
}
`;