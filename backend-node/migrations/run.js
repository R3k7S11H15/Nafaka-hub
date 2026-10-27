const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')

async function runMigration() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'jumla_rice_trading',
  }

  console.log('Running database migrations...')
  
  let connection
  try {
    connection = await mysql.createConnection(config)
    
    const migrationDir = path.join(__dirname, '..', 'database')
    const files = fs.readdirSync(migrationDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    for (const file of files) {
      const filePath = path.join(migrationDir, file)
      const sql = fs.readFileSync(filePath, 'utf8')
      
      console.log(`Processing: ${file}`)
      
      const statements = sql
        .replace(/^\s*--.*$/gm, '')
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0)

      for (const statement of statements) {
        try {
          await connection.query(statement)
        } catch (err) {
          const isDuplicate = err.code === 'ER_DUP_KEY' || err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME' || err.errno === 121 || /duplicate key/i.test(err.message)
          if (isDuplicate) {
            console.log(`  Skipped: ${err.message}`)
          } else {
            console.error(`  Error in ${file}: ${err.message}`)
            console.error(`  Statement: ${statement.substring(0, 100)}...`)
          }
        }
      }
    }

    console.log('Migrations completed successfully!')
    
    const [tables] = await connection.query("SHOW TABLES")
    console.log(`\nTables in database: ${tables.length}`)
    tables.forEach(t => console.log(`  - ${t[Object.keys(t)[0]]}`))

  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  } finally {
    if (connection) await connection.end()
  }
}

runMigration()
