/**
 * Observability & Metrics Collection
 * Tracks key performance indicators for the application
 */

class MetricsCollector {
  constructor() {
    this.metrics = {
      // API Metrics
      api: {
        totalRequests: 0,
        successfulRequests: 0,
        errorRequests: 0,
        error5xxCount: 0,
        authFailures: 0,
        requestsByEndpoint: {},
        responseTimesByEndpoint: {}
      },
      
      // AI Metrics
      ai: {
        totalCalls: 0,
        errors: 0,
        totalLatency: 0,
        avgLatency: 0,
        cacheHits: 0,
        cacheMisses: 0,
        callsByType: {}
      },
      
      // Job Metrics (for background jobs)
      jobs: {
        totalJobs: 0,
        successfulJobs: 0,
        failedJobs: 0,
        retriedJobs: 0,
        queueDepth: 0,
        jobsByType: {}
      },
      
      // Anti-cheat Metrics
      antiCheat: {
        totalInfractions: 0,
        infractionsByType: {},
        flaggedAttempts: 0,
        autoSubmissions: 0
      },
      
      // Student Progress Metrics
      studentProgress: {
        totalAttempts: 0,
        avgScore: 0,
        totalScore: 0,
        activeStudents: new Set(),
        retentionRate: 0
      }
    };
    
    // Start time for uptime tracking
    this.startTime = Date.now();
  }

  /**
   * Track API request
   */
  trackAPIRequest(endpoint, statusCode, responseTime) {
    this.metrics.api.totalRequests++;
    
    if (statusCode >= 200 && statusCode < 300) {
      this.metrics.api.successfulRequests++;
    } else {
      this.metrics.api.errorRequests++;
      
      if (statusCode >= 500) {
        this.metrics.api.error5xxCount++;
      }
    }
    
    // Track by endpoint
    if (!this.metrics.api.requestsByEndpoint[endpoint]) {
      this.metrics.api.requestsByEndpoint[endpoint] = 0;
      this.metrics.api.responseTimesByEndpoint[endpoint] = [];
    }
    
    this.metrics.api.requestsByEndpoint[endpoint]++;
    this.metrics.api.responseTimesByEndpoint[endpoint].push(responseTime);
    
    // Keep only last 100 response times per endpoint
    if (this.metrics.api.responseTimesByEndpoint[endpoint].length > 100) {
      this.metrics.api.responseTimesByEndpoint[endpoint].shift();
    }
  }

  /**
   * Track auth failure
   */
  trackAuthFailure() {
    this.metrics.api.authFailures++;
  }

  /**
   * Track AI call
   */
  trackAICall(type, latency, success = true, cacheHit = false) {
    this.metrics.ai.totalCalls++;
    this.metrics.ai.totalLatency += latency;
    this.metrics.ai.avgLatency = this.metrics.ai.totalLatency / this.metrics.ai.totalCalls;
    
    if (!success) {
      this.metrics.ai.errors++;
    }
    
    if (cacheHit) {
      this.metrics.ai.cacheHits++;
    } else {
      this.metrics.ai.cacheMisses++;
    }
    
    // Track by type
    if (!this.metrics.ai.callsByType[type]) {
      this.metrics.ai.callsByType[type] = 0;
    }
    this.metrics.ai.callsByType[type]++;
  }

  /**
   * Track background job
   */
  trackJob(type, status = 'success', retried = false) {
    this.metrics.jobs.totalJobs++;
    
    if (status === 'success') {
      this.metrics.jobs.successfulJobs++;
    } else if (status === 'failed') {
      this.metrics.jobs.failedJobs++;
    }
    
    if (retried) {
      this.metrics.jobs.retriedJobs++;
    }
    
    // Track by type
    if (!this.metrics.jobs.jobsByType[type]) {
      this.metrics.jobs.jobsByType[type] = { total: 0, success: 0, failed: 0 };
    }
    this.metrics.jobs.jobsByType[type].total++;
    
    if (status === 'success') {
      this.metrics.jobs.jobsByType[type].success++;
    } else if (status === 'failed') {
      this.metrics.jobs.jobsByType[type].failed++;
    }
  }

  /**
   * Update queue depth
   */
  updateQueueDepth(depth) {
    this.metrics.jobs.queueDepth = depth;
  }

  /**
   * Track anti-cheat infraction
   */
  trackInfraction(type, testSessionId) {
    this.metrics.antiCheat.totalInfractions++;
    
    if (!this.metrics.antiCheat.infractionsByType[type]) {
      this.metrics.antiCheat.infractionsByType[type] = 0;
    }
    this.metrics.antiCheat.infractionsByType[type]++;
  }

  /**
   * Track flagged attempt
   */
  trackFlaggedAttempt() {
    this.metrics.antiCheat.flaggedAttempts++;
  }

  /**
   * Track auto-submission due to infractions
   */
  trackAutoSubmission() {
    this.metrics.antiCheat.autoSubmissions++;
  }

  /**
   * Track student attempt
   */
  trackStudentAttempt(studentId, score) {
    this.metrics.studentProgress.totalAttempts++;
    this.metrics.studentProgress.totalScore += score;
    this.metrics.studentProgress.avgScore = this.metrics.studentProgress.totalScore / this.metrics.studentProgress.totalAttempts;
    
    // Track active students
    this.metrics.studentProgress.activeStudents.add(studentId.toString());
  }

  /**
   * Update retention rate
   */
  updateRetentionRate(rate) {
    this.metrics.studentProgress.retentionRate = rate;
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      studentProgress: {
        ...this.metrics.studentProgress,
        activeStudents: this.metrics.studentProgress.activeStudents.size
      },
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Get API metrics summary
   */
  getAPIMetrics() {
    const totalRequests = this.metrics.api.totalRequests;
    
    return {
      totalRequests,
      successRate: totalRequests > 0 ? ((this.metrics.api.successfulRequests / totalRequests) * 100).toFixed(2) : 0,
      errorRate: totalRequests > 0 ? ((this.metrics.api.errorRequests / totalRequests) * 100).toFixed(2) : 0,
      error5xxRate: totalRequests > 0 ? ((this.metrics.api.error5xxCount / totalRequests) * 100).toFixed(2) : 0,
      authFailures: this.metrics.api.authFailures,
      requestsByEndpoint: this.metrics.api.requestsByEndpoint,
      avgResponseTimeByEndpoint: this.getAvgResponseTimes()
    };
  }

  /**
   * Calculate average response times
   */
  getAvgResponseTimes() {
    const avgTimes = {};
    
    for (const [endpoint, times] of Object.entries(this.metrics.api.responseTimesByEndpoint)) {
      if (times.length > 0) {
        avgTimes[endpoint] = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2);
      }
    }
    
    return avgTimes;
  }

  /**
   * Get AI metrics summary
   */
  getAIMetrics() {
    const totalCalls = this.metrics.ai.totalCalls;
    
    return {
      totalCalls,
      errorRate: totalCalls > 0 ? ((this.metrics.ai.errors / totalCalls) * 100).toFixed(2) : 0,
      avgLatency: this.metrics.ai.avgLatency.toFixed(2),
      cacheHitRate: totalCalls > 0 ? ((this.metrics.ai.cacheHits / totalCalls) * 100).toFixed(2) : 0,
      callsByType: this.metrics.ai.callsByType
    };
  }

  /**
   * Get job metrics summary
   */
  getJobMetrics() {
    const totalJobs = this.metrics.jobs.totalJobs;
    
    return {
      totalJobs,
      successRate: totalJobs > 0 ? ((this.metrics.jobs.successfulJobs / totalJobs) * 100).toFixed(2) : 0,
      retryRate: totalJobs > 0 ? ((this.metrics.jobs.retriedJobs / totalJobs) * 100).toFixed(2) : 0,
      queueDepth: this.metrics.jobs.queueDepth,
      jobsByType: this.metrics.jobs.jobsByType
    };
  }

  /**
   * Get anti-cheat metrics
   */
  getAntiCheatMetrics() {
    return {
      totalInfractions: this.metrics.antiCheat.totalInfractions,
      infractionsByType: this.metrics.antiCheat.infractionsByType,
      flaggedAttempts: this.metrics.antiCheat.flaggedAttempts,
      autoSubmissions: this.metrics.antiCheat.autoSubmissions
    };
  }

  /**
   * Get student progress metrics
   */
  getStudentProgressMetrics() {
    return {
      totalAttempts: this.metrics.studentProgress.totalAttempts,
      avgScore: this.metrics.studentProgress.avgScore.toFixed(2),
      activeStudents: this.metrics.studentProgress.activeStudents.size,
      retentionRate: this.metrics.studentProgress.retentionRate.toFixed(2)
    };
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      api: {
        totalRequests: 0,
        successfulRequests: 0,
        errorRequests: 0,
        error5xxCount: 0,
        authFailures: 0,
        requestsByEndpoint: {},
        responseTimesByEndpoint: {}
      },
      ai: {
        totalCalls: 0,
        errors: 0,
        totalLatency: 0,
        avgLatency: 0,
        cacheHits: 0,
        cacheMisses: 0,
        callsByType: {}
      },
      jobs: {
        totalJobs: 0,
        successfulJobs: 0,
        failedJobs: 0,
        retriedJobs: 0,
        queueDepth: 0,
        jobsByType: {}
      },
      antiCheat: {
        totalInfractions: 0,
        infractionsByType: {},
        flaggedAttempts: 0,
        autoSubmissions: 0
      },
      studentProgress: {
        totalAttempts: 0,
        avgScore: 0,
        totalScore: 0,
        activeStudents: new Set(),
        retentionRate: 0
      }
    };
    this.startTime = Date.now();
  }
}

// Export singleton instance
module.exports = new MetricsCollector();
