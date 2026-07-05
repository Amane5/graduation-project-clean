export const recommendQuestionsPrompt = (
  interests:string[],
  minAge:number,
  maxAge:number
) => `
Generate 1 educational challenge questions.

Child interests:
${interests.join(', ')}

Age range:
${minAge} - ${maxAge}

Requirements:
- Fun
- Educational
- Suitable for all children in this age range

Return JSON only:

[
 {
   "question":"..."
 }
]
`