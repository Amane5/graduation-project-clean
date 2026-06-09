export const buildRegenerateQuestionsPrompt = (story: any, questions: any[]) => {
    return `You are a helpful assistant. Please regenerate questions for the following story:
    
    Story Title: ${story.title}
    Story Content: ${story.content}
    
    Existing Questions:
    ${questions.map((q) => `- ${q.question}`).join('\n')}

    - Generate completely different questions.
    - Do not rephrase previous questions.
    - Focus on different scenes and details.
    - Avoid semantic similarity with earlier questions.
    `;
    
};