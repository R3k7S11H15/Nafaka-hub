const crypto = require('crypto');

const csrfTokens = new Map();
const CSRF_TTL = 5 * 60 * 1000;

function cleanupExpired() {
    const now = Date.now();
    for (const [token, entry] of csrfTokens.entries()) {
        if (now - entry.createdAt > CSRF_TTL) {
            csrfTokens.delete(token);
        }
    }
}

function generateCSRFToken() {
    cleanupExpired();
    const token = crypto.randomBytes(32).toString('hex');
    csrfTokens.set(token, { createdAt: Date.now() });
    return token;
}

function validateCSRFToken(token) {
    if (!token) return false;
    const entry = csrfTokens.get(token);
    if (!entry) return false;
    if (Date.now() - entry.createdAt > CSRF_TTL) {
        csrfTokens.delete(token);
        return false;
    }
    csrfTokens.delete(token);
    return true;
}

function csrfProtection(req, res, next) {
    const method = req.method.toUpperCase();
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        const token = req.body?.csrf_token || req.headers['x-csrf-token'];
        if (!validateCSRFToken(token)) {
            return res.status(403).json({
                success: false,
                message: 'Invalid or expired CSRF token',
            });
        }
    }
    next();
}

module.exports = { generateCSRFToken, validateCSRFToken, csrfProtection };
