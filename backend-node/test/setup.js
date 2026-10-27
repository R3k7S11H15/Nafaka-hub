const mysql = require('mysql2/promise')
require('dotenv').config()

global.pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jumla_rice_trading',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
})
