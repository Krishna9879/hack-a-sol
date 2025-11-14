const express = require('express');
const auth = require('../middleware/auth');
const MockTest = require('../models/MockTest');
const TestSession = require('../models/TestSession');
const Attempt = require('../models/Attempt');

const router = express.Router();

// POST /api/student/mock-test
// Purpose: create a full mock exam
router.post('/', auth, async (req, res) => {
  try {
    const { examType, topics, questionCount = 50, timeMinutes = 120 } = req.body;
    const userId = req.user._id;
    
    // Validate inputs
    if (!examType) {
      return res.status(400).json({
        success: false,
        message: 'Exam type is required'
      });
    }
    
    const validExamTypes = ['JEE', 'NEET', 'CLAT', 'Custom'];
    if (!validExamTypes.includes(examType)) {
      return res.status(400).json({
        success: false,
        message: 'Exam type must be JEE, NEET, CLAT, or Custom'
      });
    }
    
    // TODO: Validate student quota
    // For now, we'll skip this implementation
    
    // TODO: Use question pool (existing DB questions) or request Gemini to generate fresh questions
    // For now, we'll create mock questions
    
    // Generate mock questions
    const questions = [];
    for (let i = 1; i <= questionCount; i++) {
      questions.push({
        id: `q${i}`,
        text: `Sample ${examType} question ${i}`,
        options: [`Option A`, `Option B`, `Option C`, `Option D`],
        correctAnswer: Math.floor(Math.random() * 4),
        subject: topics && topics.length > 0 ? topics[Math.floor(Math.random() * topics.length)] : 'General',
        difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)]
      });
    }
    
    // Create MockTest doc
    const mockTest = new MockTest({
      examType,
      topics: topics || [],
      questionCount,
      timeMinutes,
      questions,
      owner: userId
    });
    
    await mockTest.save();
    
    // Create TestSession for this student with state: created
    const testSession = new TestSession({
      mockTestId: mockTest._id,
      studentId: userId,
      state: 'created'
    });
    
    await testSession.save();
    
    // Optionally generate unique sessionToken (signed) used by test client
    // For now, we'll just use the session ID as token
    
    res.status(201).json({
      mockTestId: mockTest._id,
      sessionToken: testSession._id // In a real implementation, this would be a signed token
    });
  } catch (error) {
    console.error('Mock test creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/student/test/start
// Purpose: start a test session (enter full-screen mode client-side)
router.post('/start', auth, async (req, res) => {
  try {
    const { mockTestId, sessionToken } = req.body;
    const userId = req.user._id;
    
    // Validate inputs
    if (!mockTestId || !sessionToken) {
      return res.status(400).json({
        success: false,
        message: 'Mock test ID and session token are required'
      });
    }
    
    // Find test session
    // In a real implementation, we would verify the signed session token
    // For now, we'll just find by ID
    const testSession = await TestSession.findById(sessionToken);
    
    if (!testSession) {
      return res.status(404).json({
        success: false,
        message: 'Test session not found'
      });
    }
    
    // Verify test ownership
    if (testSession.studentId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Verify mock test
    const mockTest = await MockTest.findById(mockTestId);
    if (!mockTest) {
      return res.status(404).json({
        success: false,
        message: 'Mock test not found'
      });
    }
    
    // Update TestSession to running, set startedAt
    testSession.state = 'running';
    testSession.startedAt = new Date();
    testSession.expiresAt = new Date(Date.now() + mockTest.timeMinutes * 60000);
    
    // Set allowed actions and anti-cheat policy
    testSession.allowedActions = {
      navigation: true,
      review: true,
      flag: true
    };
    
    testSession.antiCheatPolicy = {
      maxInfractions: 2,
      allowTabSwitch: false,
      allowBlur: false,
      requireFullScreen: true
    };
    
    await testSession.save();
    
    // Return session metadata (server time, endTime)
    res.status(200).json({
      testSessionId: testSession._id,
      startedAt: testSession.startedAt,
      expiresAt: testSession.expiresAt
    });
  } catch (error) {
    console.error('Test start error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/student/test/infraction
// Purpose: log cheating attempt (tab-switch, blur)
router.post('/infraction', auth, async (req, res) => {
  try {
    const { testSessionId, type, timestamp } = req.body;
    const userId = req.user._id;
    
    // Validate inputs
    if (!testSessionId || !type) {
      return res.status(400).json({
        success: false,
        message: 'Test session ID and type are required'
      });
    }
    
    // Validate session
    const testSession = await TestSession.findById(testSessionId);
    if (!testSession) {
      return res.status(404).json({
        success: false,
        message: 'Test session not found'
      });
    }
    
    // Verify session ownership
    if (testSession.studentId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Increment infractionCount in session doc and create InfractionLog
    testSession.infractionCount = (testSession.infractionCount || 0) + 1;
    testSession.infractions.push({
      type,
      timestamp: timestamp || new Date()
    });
    
    await testSession.save();
    
    // If infractions >= threshold (e.g., 2), auto-submit test (call submit flow)
    if (testSession.infractionCount >= 2) {
      // Update session state to submitted
      testSession.state = 'submitted';
      await testSession.save();
      
      // In a real implementation, we would call the submit flow
      // For now, we'll just log this action
      console.log(`Auto-submitting test due to infractions for session ${testSessionId}`);
    }
    
    // Save event for teacher review
    res.status(200).json({ 
      acknowledged: true 
    });
  } catch (error) {
    console.error('Infraction logging error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/student/test/submit
// Purpose: submit test answers; final grading & predictive analysis
router.post('/submit', auth, async (req, res) => {
  try {
    const { testSessionId, answers } = req.body;
    const userId = req.user._id;
    
    // Validate inputs
    if (!testSessionId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'Test session ID and answers are required'
      });
    }
    
    // Find test session
    const testSession = await TestSession.findById(testSessionId);
    if (!testSession) {
      return res.status(404).json({
        success: false,
        message: 'Test session not found'
      });
    }
    
    // Validate session state (only running)
    if (testSession.state !== 'running') {
      return res.status(400).json({
        success: false,
        message: 'Test session is not in running state'
      });
    }
    
    // Verify session ownership
    if (testSession.studentId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Find mock test
    const mockTest = await MockTest.findById(testSession.mockTestId);
    if (!mockTest) {
      return res.status(404).json({
        success: false,
        message: 'Mock test not found'
      });
    }
    
    // Lock session to prevent race conditions (in a real implementation, use Redis lock)
    testSession.state = 'submitted';
    await testSession.save();
    
    // Grade using server-side answer key
    let score = 0;
    const timeStats = {
      totalSeconds: 0,
      perQuestion: []
    };
    
    for (const answer of answers) {
      const question = mockTest.questions.find(q => q.id === answer.questionId);
      if (!question) {
        return res.status(400).json({
          success: false,
          message: `Question ${answer.questionId} not found`
        });
      }
      
      const correct = answer.selectedIndex === question.correctAnswer;
      if (correct) score++;
      
      const timeTaken = answer.timeTakenSec || 0;
      timeStats.totalSeconds += timeTaken;
      timeStats.perQuestion.push({
        questionId: answer.questionId,
        timeSeconds: timeTaken,
        difficulty: question.difficulty
      });
    }
    
    // Create Attempt record (append-only)
    const attempt = new Attempt({
      studentId: userId,
      mockTestId: mockTest._id,
      answers,
      score,
      timeStats
    });
    
    await attempt.save();
    
    // TODO: Call aiService.analyzeMockAttempt with attempt + time logs for:
    // - Predictive performance band (rule-based for MVP or call model)
    // - Weak subtopics & micro-lessons
    // - Update student progress metrics
    
    // For now, we'll create mock analysis
    const predictedPerformance = 'band: 40-50';
    const remediation = [
      {
        topicId: 'general',
        reason: 'Based on your performance, you might need to review certain topics',
        plan: [
          { action: 'Review weak areas', durationMin: 60 },
          { action: 'Take additional practice tests', durationMin: 90 }
        ]
      }
    ];
    
    // Update attempt with analysis
    attempt.predictedPerformance = predictedPerformance;
    attempt.remediation = remediation;
    await attempt.save();
    
    // Return full detailed result
    res.status(200).json({
      score,
      percentile: Math.floor(Math.random() * 100), // Mock percentile
      predictedPerformance,
      remediation
    });
  } catch (error) {
    console.error('Test submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;