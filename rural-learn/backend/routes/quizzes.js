const express = require('express');
const auth = require('../middleware/auth');
const Quiz = require('../models/Quiz');
const Attempt = require('../models/Attempt');

const router = express.Router();

// POST /api/student/quiz/generate
// Purpose: generate a topic quiz
router.post('/generate', auth, async (req, res) => {
  try {
    const { topicId, count = 10, difficulty = 'mixed' } = req.body;
    const userId = req.user._id;
    
    // Validate inputs
    if (!topicId) {
      return res.status(400).json({
        success: false,
        message: 'Topic ID is required'
      });
    }
    
    if (!['mixed', 'easy', 'medium', 'hard'].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: 'Difficulty must be mixed, easy, medium, or hard'
      });
    }
    
    // TODO: Build prompt for Gemini to generate count MCQs with distractors and explanations
    // For now, we'll create mock questions
    
    // Mock quiz questions
    const mockQuestions = [];
    for (let i = 1; i <= count; i++) {
      mockQuestions.push({
        text: `Sample question ${i} about ${topicId}`,
        options: [`Option 1 for question ${i}`, `Option 2 for question ${i}`, `Option 3 for question ${i}`, `Option 4 for question ${i}`],
        correctIndex: Math.floor(Math.random() * 4),
        explanation: `Explanation for question ${i}`,
        topicId,
        difficulty: difficulty === 'mixed' ? ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)] : difficulty
      });
    }
    
    // Save Quiz object with questions
    const quiz = new Quiz({
      topicId,
      count,
      difficulty,
      questions: mockQuestions,
      owner: userId
    });
    
    await quiz.save();
    
    // Return quiz
    res.status(201).json({
      quizId: quiz._id,
      questions: quiz.questions.map(q => ({
        id: q._id,
        text: q.text,
        options: q.options,
        timeLimit: 60
      }))
    });
  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/student/quiz/:quizId/submit
// Purpose: submit answers for grading
router.post('/:quizId/submit', auth, async (req, res) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body;
    const userId = req.user._id;
    
    // Validate inputs
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'Answers are required'
      });
    }
    
    // Find quiz
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }
    
    // Check if quiz belongs to user (in a real app, this might be different)
    // For now, we'll allow any user to submit answers to any quiz
    
    // Validate that quiz hasn't already been submitted by this user
    const existingAttempt = await Attempt.findOne({ 
      studentId: userId, 
      quizId 
    });
    
    if (existingAttempt) {
      return res.status(409).json({
        success: false,
        message: 'Quiz already submitted'
      });
    }
    
    // Calculate score by comparing selectedIndex with quiz.questions.answerIndex
    let score = 0;
    const detailed = [];
    
    for (const answer of answers) {
      const question = quiz.questions.id(answer.questionId);
      if (!question) {
        return res.status(400).json({
          success: false,
          message: `Question ${answer.questionId} not found`
        });
      }
      
      const correct = answer.selectedIndex === question.correctIndex;
      if (correct) score++;
      
      detailed.push({
        questionId: answer.questionId,
        correct,
        explanation: question.explanation
      });
    }
    
    // Record Attempt with per-question time
    const attempt = new Attempt({
      studentId: userId,
      quizId,
      answers,
      score,
      detailed
    });
    
    await attempt.save();
    
    // TODO: Call aiService.analyzeQuizAttempt for remediation suggestions (optional async)
    // For now, we'll create mock remediation
    const remediation = [
      {
        topicId: quiz.topicId,
        reason: 'Based on your performance, you might need to review this topic',
        plan: [
          { action: 'Review lesson notes', durationMin: 30 },
          { action: 'Practice more questions', durationMin: 45 }
        ]
      }
    ];
    
    // Update attempt with remediation
    attempt.remediation = remediation;
    await attempt.save();
    
    // Return score & top remediation tips
    res.status(200).json({
      score,
      detailed,
      remediation
    });
  } catch (error) {
    console.error('Quiz submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;