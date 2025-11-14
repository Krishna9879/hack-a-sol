const express = require('express');
const auth = require('../middleware/auth');
const Roadmap = require('../models/Roadmap');
const User = require('../models/User');

const router = express.Router();

// POST /api/student/roadmap
// Purpose: generate a subject-specific roadmap (AI-powered)
router.post('/', auth, async (req, res) => {
  try {
    const { subject, level, goal } = req.body;
    const userId = req.user._id;
    
    // Validate inputs
    if (!subject || !level) {
      return res.status(400).json({
        success: false,
        message: 'Subject and level are required'
      });
    }
    
    if (!['beginner', 'intermediate', 'advanced'].includes(level)) {
      return res.status(400).json({
        success: false,
        message: 'Level must be beginner, intermediate, or advanced'
      });
    }
    
    // TODO: Implement rate limiting check (e.g., 3 free roadmaps/day)
    // For now, we'll skip this implementation
    
    // TODO: Construct Gemini prompt and call aiService.generateRoadmap(prompt)
    // For now, we'll create a mock roadmap
    
    // Mock roadmap data
    const mockRoadmap = {
      subject,
      level,
      goal: goal || '',
      topics: [
        {
          id: 't1',
          title: `Introduction to ${subject}`,
          subtopics: [`Basic concepts of ${subject}`, `History of ${subject}`],
          objectives: [`Understand what ${subject} is`, `Learn basic terminology`],
          estimatedMinutes: 120
        },
        {
          id: 't2',
          title: `Advanced ${subject}`,
          subtopics: [`Complex concepts of ${subject}`, `Real-world applications`],
          objectives: [`Master advanced ${subject} concepts`, `Apply knowledge in projects`],
          estimatedMinutes: 180
        }
      ],
      estimatedHours: 5
    };
    
    // Save roadmap to database
    const roadmap = new Roadmap({
      ...mockRoadmap,
      owner: userId,
      source: 'ai'
    });
    
    await roadmap.save();
    
    res.status(201).json({
      roadmapId: roadmap._id,
      roadmap: {
        subject: roadmap.subject,
        topics: roadmap.topics,
        estimatedHours: roadmap.estimatedHours
      }
    });
  } catch (error) {
    console.error('Roadmap generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;