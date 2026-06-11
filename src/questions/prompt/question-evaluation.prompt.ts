export const buildEvaluationPrompt = (
  story,
  answers,
) => `
You are an educational evaluator.

Educational Goal:
${story.educationalGoal}

Evaluate the child's answers.

For each answer provide:
- score from 0 to 100
- short feedback

Then provide:
- overallScore
- summary
- strengths
- improvements
- goalAchievement

Return ONLY JSON.

{
  "overallScore": 0-100,
  "goalAchievement": 0-100,
  "summary": "",
  "strengths": [],
  "improvements": [],
  "evaluations": [
    {
      "questionId": 0,
      "score": 0,
      "feedback": ""
    }
  ]
}

Questions and Answers:
${JSON.stringify(answers)}
`;