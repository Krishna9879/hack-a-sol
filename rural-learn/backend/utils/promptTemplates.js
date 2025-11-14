/**
 * Gemini AI Prompt Templates
 * All prompts follow the pattern: SYSTEM instruction + USER request
 * Always output valid JSON with no extra commentary
 */

const SYSTEM_BASE = 'You are an educational AI assistant. Output valid JSON only. No extra commentary or markdown.';

/**
 * Generate a subject-specific roadmap
 */
const generateRoadmapPrompt = (subject, level, goal = '') => {
  const systemPrompt = SYSTEM_BASE + ' You are an educational curriculum designer.';
  
  const userPrompt = `Create a JSON roadmap for subject "${subject}" at "${level}" level${goal ? ` with goal: "${goal}"` : ''}.

Requirements:
- Include 5-12 topics
- Each topic must have: id, title, subtopics (array), objectives (array), estimatedMinutes
- Calculate total estimatedHours

Output format:
{
  "subject": "${subject}",
  "estimatedHours": <number>,
  "topics": [
    {
      "id": "t1",
      "title": "Topic Title",
      "subtopics": ["Subtopic 1", "Subtopic 2"],
      "objectives": ["Objective 1", "Objective 2"],
      "estimatedMinutes": 120
    }
  ]
}`;

  return { systemPrompt, userPrompt };
};

/**
 * Summarize transcript to generate lesson content
 */
const summarizeTranscriptPrompt = (transcriptText, topicTitle) => {
  const systemPrompt = SYSTEM_BASE + ' You are an educational summarizer.';
  
  const userPrompt = `Given the following transcript about "${topicTitle}", produce a structured lesson summary.

TRANSCRIPT:
${transcriptText}

Output format:
{
  "title": "Lesson Title",
  "summary": "Brief 2-3 sentence summary",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "stepByStep": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
  "examples": ["Example 1", "Example 2"],
  "mcqs": [
    {
      "q": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 1,
      "explanation": "Why this is correct"
    }
  ]
}

Generate 5 MCQs covering key concepts.`;

  return { systemPrompt, userPrompt };
};

/**
 * Generate MCQ questions for a topic
 */
const generateMCQPrompt = (topicId, topicTitle, count = 10, difficulty = 'mixed') => {
  const systemPrompt = SYSTEM_BASE + ' You are an exam question writer.';
  
  const difficultyInstruction = difficulty === 'mixed' 
    ? 'Mix of easy (30%), medium (50%), and hard (20%) questions'
    : `All questions should be ${difficulty} difficulty`;
  
  const userPrompt = `Generate ${count} multiple-choice questions for topic "${topicTitle}" (ID: ${topicId}).

Requirements:
- ${difficultyInstruction}
- 4 options per question
- Include plausible distractors
- Provide explanation for correct answer

Output format (JSON array):
[
  {
    "text": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Explanation of correct answer",
    "topicId": "${topicId}",
    "difficulty": "easy|medium|hard"
  }
]`;

  return { systemPrompt, userPrompt };
};

/**
 * Analyze quiz/test attempt for remediation
 */
const analyzeAttemptPrompt = (attemptData, examType = 'quiz') => {
  const systemPrompt = SYSTEM_BASE + ' You are an educational analyst.';
  
  const userPrompt = `Analyze the following student ${examType} attempt and provide personalized recommendations.

ATTEMPT DATA:
${JSON.stringify(attemptData, null, 2)}

Analyze:
1. Identify weak topics (topics with <60% accuracy)
2. Time management issues (questions taking >2x expected time)
3. Predicted performance band for ${examType === 'mock-test' ? 'actual exam' : 'future tests'}

Output format:
{
  "weakTopics": [
    {
      "topic": "Topic name",
      "priority": 1,
      "accuracy": 45,
      "reason": "Why this needs attention"
    }
  ],
  "timeRecommendations": [
    {
      "topic": "Topic name",
      "targetSeconds": 60,
      "currentAverage": 120,
      "suggestion": "Specific advice"
    }
  ],
  "predictedBand": "40-50",
  "overallSuggestions": ["General study tip 1", "General study tip 2"]
}`;

  return { systemPrompt, userPrompt };
};

/**
 * Generate career roadmap
 */
const generateCareerPathPrompt = (goal, startingLevel) => {
  const systemPrompt = SYSTEM_BASE + ' You are an expert career mentor.';
  
  const userPrompt = `Provide a 6-12 month roadmap for career goal: "${goal}" starting from ${startingLevel} level.

Requirements:
- Break into 4-6 phases
- Each phase: duration in weeks, skills to learn, projects to build
- Include interview preparation phase
- Recommend study resources (general types, not specific links)

Output format:
{
  "phases": [
    {
      "phase": "Foundation",
      "weeks": 4,
      "skills": ["Skill 1", "Skill 2"],
      "projects": ["Project 1", "Project 2"]
    }
  ]
}`;

  return { systemPrompt, userPrompt };
};

/**
 * Generate remediation plan based on weak topics
 */
const generateRemediationPrompt = (weakTopics, timeAvailable = 7) => {
  const systemPrompt = SYSTEM_BASE + ' You are a personalized tutor.';
  
  const userPrompt = `Create a ${timeAvailable}-day remediation plan for the following weak topics:

WEAK TOPICS:
${JSON.stringify(weakTopics, null, 2)}

For each topic, provide:
- Daily study tasks (realistic for students)
- Practice exercises
- Duration estimates
- Success criteria

Output format:
{
  "plan": [
    {
      "day": 1,
      "topic": "Topic name",
      "tasks": [
        {
          "action": "Watch video on basics",
          "durationMin": 15
        },
        {
          "action": "Practice 10 problems",
          "durationMin": 30
        }
      ]
    }
  ]
}`;

  return { systemPrompt, userPrompt };
};

module.exports = {
  generateRoadmapPrompt,
  summarizeTranscriptPrompt,
  generateMCQPrompt,
  analyzeAttemptPrompt,
  generateCareerPathPrompt,
  generateRemediationPrompt
};
