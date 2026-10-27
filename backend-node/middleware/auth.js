const jwt = require('jsonwebtoken')

function extractAuthUser(req) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  try {
    const token = authHeader.split(' ')[1]
    return jwt.verify(token, process.env.JWT_SECRET || 'nafaka-hub-secret-key-change-in-production')
  } catch (err) {
    return null
  }
}

function requireAuth(req, res, next) {
  const auth = extractAuthUser(req)
  if (!auth) {
    return res.status(401).json({ success: false, message: 'Unauthorized' })
  }
  req.user = auth
  next()
}

module.exports = { extractAuthUser, requireAuth }
