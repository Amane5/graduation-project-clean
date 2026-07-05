export const evaluateAnswerPrompt = (
    question:string,
  expectedAnswer:string,
  childAnswer:string
) => `
Question:
${question}

Expected Answer:

${expectedAnswer}

Child Answer:

${childAnswer}

Determine if the child answer expresses the same meaning.

Return JSON only:

{
 "correct": true
}
`