async function auditLog(action, entityType, req, res, next) {
  try {
    const pool = req.app.locals.db
    if (!pool) return next()

    const authHeader = req.headers.authorization
    let actorId = null
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken')
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'nafaka-hub-secret-key-change-in-production')
        actorId = decoded.customerId
      } catch {}
    }

    const entityId = req.params.id || req.params.customerId || null
    const details = {
      method: req.method,
      path: req.path,
      body: req.body ? { ...req.body, csrf_token: undefined } : undefined,
    }

    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)`,
      [actorId, action, entityType, entityId, JSON.stringify(details), req.ip || req.connection.remoteAddress]
    )
  } catch (err) {
    console.error('Audit log error:', err.message)
  }
  next()
}

module.exports = { auditLog }
