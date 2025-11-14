const metrics = require('../utils/metrics');

/**
 * Middleware to track API request metrics
 */
const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Track response
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const endpoint = `${req.method} ${req.route ? req.route.path : req.path}`;
    
    metrics.trackAPIRequest(endpoint, res.statusCode, responseTime);
  });
  
  next();
};

module.exports = metricsMiddleware;
