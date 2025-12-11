const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tsi_app',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// — HANDLE UNCLEAN DISCONNECTS —
// (MySQL server restarts, XAMPP freezes, idle timeout, etc.)
pool.on('error', (err) => {
  console.error('[MYSQL POOL ERROR]', err.code);

  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('🔄 MySQL connection lost. Attempting to reconnect...');
  }

  if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') {
    console.log('🔄 MySQL dropped connection. Retrying...');
  }
});

// Test connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('MySQL Connected Successfully!');
    connection.release();
  } catch (err) {
    console.error('Failed to connect to MySQL:', err.message);
    process.exit(1);
  }
})();

module.exports = pool;