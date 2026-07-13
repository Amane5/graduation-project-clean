export const recommendQuestionsPrompt = (
  interests:string[],
  minAge:number,
  maxAge:number
) => `
Generate 1 educational competition question for children.

The question will be used in a scored challenge where all children answer the same question and their answers are compared to a predefined expected answer.

Child interests:
${interests.join(', ')}

Age range:
${minAge} - ${maxAge}

The question MUST have one clear, objective, verifiable expected answer.

Never generate:
- opinion questions
- preference questions
- creative writing prompts
- imagination questions
- drawing activities
- open-ended discussion questions
- "What would you do..."
- "What is your favorite..."
- "If you could..."
- "Imagine..."

The expected answer should be short and easy to compare.

Avoid questions that could reasonably have many different correct answers.

Good examples:

✔ What is the largest planet in our solar system?
✔ How many legs does a spider have?
✔ What gas do plants absorb from the air?
✔ What is the capital of France?
✔ Which animal is known as the King of the Jungle?

Bad examples:

✘ What is your favorite animal?
✘ If you could invent a planet...
✘ What superpower would you choose?
✘ Draw your dream house.
✘ What sport would you invent?

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