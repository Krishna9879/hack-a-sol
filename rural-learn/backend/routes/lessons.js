const express = require('express');
const auth = require('../middleware/auth');
const Lesson = require('../models/Lesson');
const Roadmap = require('../models/Roadmap');

const router = express.Router();

// POST /api/student/lesson/generate
// Purpose: for a specific roadmap subtopic generate lesson notes & PDF using Gemini (and optionally YouTube)
router.post('/generate', auth, async (req, res) => {
  try {
    const { roadmapId, topicId, source, options } = req.body;
    const userId = req.user._id;
    
    // Validate inputs
    if (!roadmapId || !topicId) {
      return res.status(400).json({
        success: false,
        message: 'Roadmap ID and topic ID are required'
      });
    }
    
    // Validate roadmap ownership
    const roadmap = await Roadmap.findOne({ _id: roadmapId, owner: userId });
    if (!roadmap) {
      return res.status(404).json({
        success: false,
        message: 'Roadmap not found or not owned by user'
      });
    }
    
    // Check if topic exists in roadmap
    const topic = roadmap.topics.find(t => t.id === topicId);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found in roadmap'
      });
    }
    
    // Create Lesson placeholder doc with status processing
    const lesson = new Lesson({
      roadmapId,
      topicId,
      owner: userId,
      source: source || {},
      status: 'processing'
    });
    
    await lesson.save();
    
    // TODO: Enqueue a background job (BullMQ) to:
    // 1. If youtubeUrl provided: fetch captions via YouTube Data API (or transcript service)
    // 2. If no captions: optionally run speech-to-text (external service)
    // 3. Chunk transcript -> call aiService.summarizeTranscript(...) to produce content
    // 4. Generate HTML notes and convert to PDF
    // 5. Upload PDF to S3 and update Lesson.ai.pdfUrl
    // 6. Update Lesson.status to ready and notify user
    
    // For now, we'll simulate the process with mock data
    setTimeout(async () => {
      try {
        // Mock lesson content
        const updatedLesson = await Lesson.findById(lesson._id);
        if (updatedLesson) {
          updatedLesson.title = `${topic.title} - Lesson Notes`;
          updatedLesson.summary = `This is a summary of ${topic.title}`;
          updatedLesson.keyPoints = ['Key point 1', 'Key point 2', 'Key point 3'];
          updatedLesson.stepByStep = ['Step 1', 'Step 2', 'Step 3'];
          updatedLesson.examples = ['Example 1', 'Example 2'];
          updatedLesson.mcqs = [
            {
              q: 'What is the main concept?',
              options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
              answer: 1,
              explanation: 'This is the explanation'
            }
          ];
          updatedLesson.status = 'ready';
          // Mock PDF URL
          updatedLesson.ai = { pdfUrl: `https://example.com/lesson-${lesson._id}.pdf` };
          
          await updatedLesson.save();
        }
      } catch (err) {
        console.error('Lesson generation error:', err);
        // In a real implementation, we would update the lesson status to 'failed'
      }
    }, 3000); // Simulate 3 second processing time
    
    res.status(202).json({
      jobId: `job-${lesson._id}`,
      lessonId: lesson._id,
      status: 'processing'
    });
  } catch (error) {
    console.error('Lesson generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/student/lesson/:id
// Purpose: fetch lesson (summary, PDF link, MCQs)
router.get('/:id', auth, async (req, res) => {
  try {
    const lessonId = req.params.id;
    const userId = req.user._id;
    
    // Find lesson and check ownership
    const lesson = await Lesson.findOne({ 
      _id: lessonId, 
      owner: userId 
    }).populate('roadmapId');
    
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found or not owned by user'
      });
    }
    
    // Return lesson info
    res.status(200).json({
      id: lesson._id,
      roadmapId: lesson.roadmapId._id,
      topicId: lesson.topicId,
      title: lesson.title,
      summary: lesson.summary,
      keyPoints: lesson.keyPoints,
      stepByStep: lesson.stepByStep,
      examples: lesson.examples,
      mcqs: lesson.mcqs,
      status: lesson.status,
      pdfUrl: lesson.ai?.pdfUrl
    });
  } catch (error) {
    console.error('Get lesson error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/student/lesson/:id/download
// Purpose: download lesson PDF
router.get('/:id/download', auth, async (req, res) => {
  try {
    const lessonId = req.params.id;
    const userId = req.user._id;
    
    // Find lesson and check ownership
    const lesson = await Lesson.findOne({ 
      _id: lessonId, 
      owner: userId 
    });
    
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found or not owned by user'
      });
    }
    
    if (lesson.status !== 'ready') {
      return res.status(400).json({
        success: false,
        message: 'Lesson is not ready for download'
      });
    }
    
    if (!lesson.ai?.pdfUrl) {
      return res.status(404).json({
        success: false,
        message: 'PDF not available for this lesson'
      });
    }
    
    // In a real implementation, we would issue a signed S3 URL
    // For now, we'll just redirect to the mock URL
    res.status(200).json({
      url: lesson.ai.pdfUrl
    });
  } catch (error) {
    console.error('Download lesson error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;