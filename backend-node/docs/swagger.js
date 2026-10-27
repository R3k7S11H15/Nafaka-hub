const swaggerJsdoc = require('swagger-jsdoc')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Nafaka Hub Admin API',
      version: '1.0.0',
      description: 'Admin API for Nafaka Hub marketplace',
      contact: {
        name: 'Nafaka Hub Team',
      },
    },
    servers: [
      { url: 'http://localhost:3000/api', description: 'Development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./routes/*.js', './routes/**/*.js'],
}

const specs = swaggerJsdoc(options)
module.exports = specs
