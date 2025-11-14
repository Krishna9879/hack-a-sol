const express = require('express');
const metrics = require('../utils/metrics');
const aiService = require('../utils/aiService');

const router = express.Router();

// GET /api/metrics
// Get all metrics
router.get('/', (req, res) => {
  try {
    const allMetrics = {
      api: metrics.getAPIMetrics(),
      ai: {
        ...metrics.getAIMetrics(),
        aiService: aiService.getMetrics()
      },
      jobs: metrics.getJobMetrics(),
      antiCheat: metrics.getAntiCheatMetrics(),
      studentProgress: metrics.getStudentProgressMetrics(),
      uptime: Date.now() - metrics.startTime
    };
    
    res.status(200).json(allMetrics);
  } catch (error) {
    console.error('Metrics endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve metrics'
    });
  }
});

// GET /api/metrics/api
// Get API metrics only
router.get('/api', (req, res) => {
  try {
    res.status(200).json(metrics.getAPIMetrics());
  } catch (error) {
    console.error('API metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve API metrics'
    });
  }
});

// GET /api/metrics/ai
// Get AI metrics only
router.get('/ai', (req, res) => {
  try {
    res.status(200).json({
      ...metrics.getAIMetrics(),
      aiService: aiService.getMetrics()
    });
  } catch (error) {
    console.error('AI metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve AI metrics'
    });
  }
});

// GET /api/metrics/health
// Health check endpoint
router.get('/health', (req, res) => {
  try {
    const apiMetrics = metrics.getAPIMetrics();
    const aiMetrics = metrics.getAIMetrics();
    
    const isHealthy = 
      parseFloat(apiMetrics.error5xxRate) < 5 &&
      parseFloat(aiMetrics.errorRate) < 10;
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      api: {
        error5xxRate: apiMetrics.error5xxRate,
        errorRate: apiMetrics.errorRate
      },
      ai: {
        errorRate: aiMetrics.errorRate,
        avgLatency: aiMetrics.avgLatency
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      message: error.message
    });
  }
});

module.exports = router;
