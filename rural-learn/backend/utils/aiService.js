const { GoogleGenerativeAI } = require('@google/generative-ai');
const promptTemplates = require('./promptTemplates');

/**
 * Enhanced AI Service with strict validation
 * Implements safety constraints and output validation
 */
class AIService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Metrics tracking
    this.metrics = {
      totalCalls: 0,
      errors: 0,
      avgLatency: 0,
      cacheHits: 0
    };
    
    // Simple in-memory cache (in production, use Redis)
    this.cache = new Map();
  }

  /**
   * Call Gemini API with validation
   */
  async callGemini(systemPrompt, userPrompt, cacheKey = null) {
    const startTime = Date.now();
    this.metrics.totalCalls++;

    try {
      // Check cache first
      if (cacheKey && this.cache.has(cacheKey)) {
        this.metrics.cacheHits++;
        console.log('[AI Cache Hit]:', cacheKey);
        return this.cache.get(cacheKey);
      }

      // Combine prompts
      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
      
      // Call Gemini API
      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      // Calculate latency
      const latency = Date.now() - startTime;
      this.metrics.avgLatency = (this.metrics.avgLatency * (this.metrics.totalCalls - 1) + latency) / this.metrics.totalCalls;

      // Clean and parse JSON
      const cleanedText = this.cleanJSONResponse(text);
      const parsed = JSON.parse(cleanedText);

      // Cache if key provided
      if (cacheKey) {
        this.cache.set(cacheKey, parsed);
        // Simple cache expiry (keep only last 100 items)
        if (this.cache.size > 100) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }
      }

      console.log(`[AI Success] Latency: ${latency}ms`);
      return parsed;

    } catch (error) {
      this.metrics.errors++;
      console.error('[AI Error]:', error.message);
      throw new Error('AI service failed: ' + error.message);
    }
  }

  /**
   * Clean JSON response by removing markdown code blocks and extra text
   */
  cleanJSONResponse(text) {
    // Remove markdown code blocks
    let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Try to find JSON object/array in the text
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
    
    return cleaned.trim();
  }

  /**
   * Validate roadmap structure
   */
  validateRoadmap(roadmap) {
    if (!roadmap.subject || !roadmap.topics || !Array.isArray(roadmap.topics)) {
      throw new Error('Invalid roadmap structure');
    }
    
    if (roadmap.topics.length < 5 || roadmap.topics.length > 12) {
      throw new Error('Roadmap must have 5-12 topics');
    }
    
    roadmap.topics.forEach((topic, idx) => {
      if (!topic.id || !topic.title || !Array.isArray(topic.subtopics) || !Array.isArray(topic.objectives)) {
        throw new Error(`Invalid topic structure at index ${idx}`);
      }
      if (topic.objectives.length < 1) {
        throw new Error(`Topic ${topic.id} must have at least 1 objective`);
      }
    });
    
    return true;
  }

  /**
   * Validate MCQ structure
   */
  validateMCQs(mcqs) {
    if (!Array.isArray(mcqs) || mcqs.length === 0) {
      throw new Error('MCQs must be a non-empty array');
    }
    
    mcqs.forEach((mcq, idx) => {
      if (!mcq.text || !Array.isArray(mcq.options) || mcq.options.length !== 4) {
        throw new Error(`Invalid MCQ structure at index ${idx}`);
      }
      if (typeof mcq.correctIndex !== 'number' || mcq.correctIndex < 0 || mcq.correctIndex > 3) {
        throw new Error(`Invalid correctIndex at index ${idx}`);
      }
    });
    
    return true;
  }

  /**
   * Generate roadmap
   */
  async generateRoadmap(subject, level, goal = '') {
    const { systemPrompt, userPrompt } = promptTemplates.generateRoadmapPrompt(subject, level, goal);
    const cacheKey = `roadmap:${subject}:${level}:${goal}`;
    
    const roadmap = await this.callGemini(systemPrompt, userPrompt, cacheKey);
    this.validateRoadmap(roadmap);
    
    return roadmap;
  }

  /**
   * Summarize transcript
   */
  async summarizeTranscript(transcriptText, topicTitle) {
    const { systemPrompt, userPrompt } = promptTemplates.summarizeTranscriptPrompt(transcriptText, topicTitle);
    
    const summary = await this.callGemini(systemPrompt, userPrompt);
    
    // Validate summary structure
    if (!summary.title || !summary.summary || !Array.isArray(summary.keyPoints)) {
      throw new Error('Invalid summary structure');
    }
    
    if (summary.mcqs) {
      this.validateMCQs(summary.mcqs);
    }
    
    return summary;
  }

  /**
   * Generate MCQ questions
   */
  async generateMCQ(topicId, topicTitle, count = 10, difficulty = 'mixed') {
    const { systemPrompt, userPrompt } = promptTemplates.generateMCQPrompt(topicId, topicTitle, count, difficulty);
    
    const mcqs = await this.callGemini(systemPrompt, userPrompt);
    this.validateMCQs(mcqs);
    
    return mcqs;
  }

  /**
   * Analyze quiz/test attempt
   */
  async analyzeAttempt(attemptData, examType = 'quiz') {
    const { systemPrompt, userPrompt } = promptTemplates.analyzeAttemptPrompt(attemptData, examType);
    
    const analysis = await this.callGemini(systemPrompt, userPrompt);
    
    // Validate analysis structure
    if (!analysis.weakTopics || !Array.isArray(analysis.weakTopics)) {
      throw new Error('Invalid analysis structure');
    }
    
    return analysis;
  }

  /**
   * Generate career path
   */
  async generateCareerPath(goal, startingLevel) {
    const { systemPrompt, userPrompt } = promptTemplates.generateCareerPathPrompt(goal, startingLevel);
    const cacheKey = `career:${goal}:${startingLevel}`;
    
    const careerPath = await this.callGemini(systemPrompt, userPrompt, cacheKey);
    
    // Validate career path structure
    if (!careerPath.phases || !Array.isArray(careerPath.phases)) {
      throw new Error('Invalid career path structure');
    }
    
    return careerPath;
  }

  /**
   * Generate remediation plan
   */
  async generateRemediation(weakTopics, timeAvailable = 7) {
    const { systemPrompt, userPrompt } = promptTemplates.generateRemediationPrompt(weakTopics, timeAvailable);
    
    const remediation = await this.callGemini(systemPrompt, userPrompt);
    
    // Validate remediation structure
    if (!remediation.plan || !Array.isArray(remediation.plan)) {
      throw new Error('Invalid remediation structure');
    }
    
    return remediation;
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      errorRate: this.metrics.totalCalls > 0 ? (this.metrics.errors / this.metrics.totalCalls) * 100 : 0,
      cacheHitRate: this.metrics.totalCalls > 0 ? (this.metrics.cacheHits / this.metrics.totalCalls) * 100 : 0
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('[AI Cache] Cleared');
  }
}

module.exports = new AIService();
