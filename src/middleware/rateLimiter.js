const { RateLimiterMemory } = require('rate-limiter-flexible');

const rateLimiter = new RateLimiterMemory({
  points: 100, // 100 requests
  duration: 60, // per 60 seconds
});

const rateLimiterMiddleware = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    await rateLimiter.consume(ip);
    next();
  } catch (err) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later'
    });
  }
};

module.exports = { rateLimiterMiddleware };