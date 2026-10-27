const rateLimitStore = new Map()

function rateLimit(windowMs = 60000, maxRequests = 30) {
  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress
    const now = Date.now()
    const windowStart = now - windowMs

    const record = rateLimitStore.get(key) || { count: 0, resetTime: now }

    if (now > record.resetTime) {
      record.count = 0
      record.resetTime = now + windowMs
    }

    record.count++
    rateLimitStore.set(key, record)

    if (record.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      })
    }

    next()
  }
}

function aiRateLimit(req, res, next) {
  return rateLimit(60000, 20)(req, res, next)
}

module.exports = { rateLimit, aiRateLimit }
