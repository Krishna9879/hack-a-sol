const express = require('express');
const auth = require('../middleware/auth');
const CareerPath = require('../models/CareerPath');

const router = express.Router();

// POST /api/student/career-path
// Purpose: produce AI-generated career roadmap
router.post('/', auth, async (req, res) => {
  try {
    const { goal, startingLevel } = req.body;
    const userId = req.user._id;
    
    // Validate inputs
    if (!goal || !startingLevel) {
      return res.status(400).json({
        success: false,
        message: 'Goal and starting level are required'
      });
    }
    
    if (!['beginner', 'intermediate', 'advanced'].includes(startingLevel)) {
      return res.status(400).json({
        success: false,
        message: 'Starting level must be beginner, intermediate, or advanced'
      });
    }
    
    // TODO: Call aiService.generateCareerPath(goal, startingLevel) with system prompt
    // For now, we'll create a mock career path
    
    // Mock career path data
    const mockCareerPath = {
      goal,
      startingLevel,
      roadmap: {
        phases: [
          {
            phase: 'Foundation',
            weeks: 4,
            skills: ['Basic programming', 'HTML/CSS', 'JavaScript fundamentals'],
            projects: ['Personal website', 'Simple calculator app']
          },
          {
            phase: 'Intermediate',
            weeks: 8,
            skills: ['React.js', 'Node.js', 'Database management'],
            projects: ['E-commerce site', 'Social media dashboard']
          },
          {
            phase: 'Advanced',
            weeks: 12,
            skills: ['Advanced React patterns', 'State management', 'Testing', 'Deployment'],
            projects: ['Full-stack application', 'Open source contribution']
          },
          {
            phase: 'Job Preparation',
            weeks: 4,
            skills: ['Resume building', 'Interview preparation', 'Portfolio development'],
            projects: ['Portfolio website', 'Technical blog']
          }
        ]
      }
    };
    
    // Save to CareerPath model
    const careerPath = new CareerPath({
      ...mockCareerPath,
      owner: userId
    });
    
    await careerPath.save();
    
    // Return roadmap
    res.status(201).json({
      careerPathId: careerPath._id,
      roadmap: careerPath.roadmap
    });
  } catch (error) {
    console.error('Career path generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;