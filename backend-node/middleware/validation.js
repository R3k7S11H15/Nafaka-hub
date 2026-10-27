function validateRequired(fields) {
  return (req, res, next) => {
    const missing = fields.filter(field => {
      const value = req.body[field]
      return value === undefined || value === null || value === ''
    })
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: `Missing required fields: ${missing.join(', ')}`,
        missing_fields: missing,
      })
    }
    next()
  }
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

function validatePhone(phone) {
  const re = /^[+]?[\d\s()-]+$/
  return re.test(phone) && phone.replace(/[^0-9]/g, '').length >= 10
}

function validateAmount(amount) {
  const num = parseFloat(amount)
  return !isNaN(num) && num >= 0
}

function validatePositiveInt(value) {
  const num = parseInt(value)
  return !isNaN(num) && num > 0
}

function sanitizeString(str, maxLength = 255) {
  if (typeof str !== 'string') return ''
  return str.trim().slice(0, maxLength)
}

module.exports = {
  validateRequired,
  validateEmail,
  validatePhone,
  validateAmount,
  validatePositiveInt,
  sanitizeString,
}