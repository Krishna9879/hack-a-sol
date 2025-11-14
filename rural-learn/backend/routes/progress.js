const express = require('express');
const auth = require('../middleware/auth');
const Attempt = require('../models/Attempt');
const User = require('../models/User');

const router = express.Router();

// GET /api/student/progress
// Purpose: overview of mastery, streaks, recent attempts
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Query Attempt collection for last N attempts for the user
    const attempts = await Attempt.find({ studentId: userId })
      .sort({ createdAt: -1 })
      .limit(10);
    
    // Aggregate mastery per topic: correctCount/totalCount weighted by recency
    const mastery = {};
    const topicAttempts = {};
    
    attempts.forEach(attempt => {
      if (attempt.detailed) {
        attempt.detailed.forEach(detail => {
          const topicId = detail.topicId || 'general';
          if (!topicAttempts[topicId]) {
            topicAttempts[topicId] = { correct: 0, total: 0 };
          }
          topicAttempts[topicId].total += 1;
          if (detail.correct) {
            topicAttempts[topicId].correct += 1;
          }
        });
      }
    });
    
    // Calculate mastery percentages
    Object.keys(topicAttempts).forEach(topicId => {
      const { correct, total } = topicAttempts[topicId];
      mastery[topicId] = Math.round((correct / total) * 100);
    });
    
    // Compute streaks (days with learning activity)
    // For simplicity, we'll calculate a basic streak
    let streak = 0;
    if (attempts.length > 0) {
      // Mock streak calculation
      streak = Math.min(attempts.length, 7); // Max streak of 7 days
    }
    
    // Get user to retrieve current streak
    const user = await User.findById(userId);
    if (user && user.progress) {
      streak = user.progress.currentStreak || streak;
    }
    
    // Format mastery data for response
    const masteryArray = Object.keys(mastery).map(topicId => ({
      topicId,
      masteryPercent: mastery[topicId]
    }));
    
    // Format recent attempts
    const recentAttempts = attempts.map(attempt => ({
      id: attempt._id,
      score: attempt.score,
      createdAt: attempt.createdAt,
      type: attempt.quizId ? 'quiz' : attempt.mockTestId ? 'mock-test' : 'unknown'
    }));
    
    // TODO: Return progress metrics, badges, and suggested next lessons (via aiService optional)
    // For now, we'll return basic data
    
    res.status(200).json({
      mastery: masteryArray,
      streak,
      recentAttempts
    });
  } catch (error) {
    console.error('Progress overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/student/tests/history
// Purpose: list past tests & attempts
router.get('/tests/history', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Find all attempts for the user
    const attempts = await Attempt.find({ studentId: userId })
      .sort({ createdAt: -1 })
      .limit(20); // Limit to 20 most recent attempts
    
    // Format attempts for response
    const history = attempts.map(attempt => ({
      id: attempt._id,
      score: attempt.score,
      percentile: attempt.percentile,
      predictedPerformance: attempt.predictedPerformance,
      createdAt: attempt.createdAt,
      type: attempt.quizId ? 'quiz' : attempt.mockTestId ? 'mock-test' : 'unknown'
    }));
    
    res.status(200).json({
      recentAttempts: history
    });
  } catch (error) {
    console.error('Test history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;