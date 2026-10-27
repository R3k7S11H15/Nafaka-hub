function errorHandler(err, req, res, next) {
  const isProd = process.env.NODE_ENV === 'production'
  
  let statusCode = err.statusCode || 500
  let errorCode = err.code || 'INTERNAL_ERROR'
  let message = err.message || 'Internal server error'
  
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409
    errorCode = 'DUPLICATE_ENTRY'
    message = 'Resource already exists'
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400
    errorCode = 'INVALID_REFERENCE'
    message = 'Referenced resource does not exist'
  } else if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    statusCode = 409
    errorCode = 'REFERENCED_RESOURCE'
    message = 'Cannot delete resource that is referenced by other records'
  }
  
  const response = {
    success: false,
    error: errorCode,
    message: isProd ? message.replace(/mysql.*/i, '').trim() || 'Internal server error' : message,
  }
  
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    response.stack = err.stack
  }
  
  res.status(statusCode).json(response)
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: 'Endpoint not found',
  })
}

module.exports = { errorHandler, notFoundHandler }