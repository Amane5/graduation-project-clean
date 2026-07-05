export const recommendAnswerPrompt = (
  question:string
) => `
Question:

${question}

Provide the ideal answer.

Return JSON only:

{
 "answer":"..."
}
`