import mssql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  server: process.env.AZURE_SQL_SERVER || '',
  database: process.env.AZURE_SQL_DATABASE || '',
  user: process.env.AZURE_SQL_USER || '',
  password: process.env.AZURE_SQL_PASSWORD || '',
  port: Number(process.env.AZURE_SQL_PORT) || 1433,
  options: {
    encrypt: true, // For Azure SQL
    trustServerCertificate: false, // Change to true for local dev / self-signed certs
    enableArithAbort: true
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Create a global pool
const pool = new mssql.ConnectionPool(config);

// Connect with better error handling
const sqlPool = pool.connect().catch(err => {
  console.error('Failed to connect to Azure SQL Database:', err);
  console.error('Connection config (without password):', {
    server: config.server,
    database: config.database,
    user: config.user,
    port: config.port
  });
  return Promise.reject(err);
});

// Add error listener to the pool
pool.on('error', err => {
  console.error('SQL Pool Error:', err);
});

export default sqlPool; 