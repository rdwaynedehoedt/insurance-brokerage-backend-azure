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
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Create a global pool that will be reused across requests
const pool = new mssql.ConnectionPool(config);

const sqlPool = pool.connect();

export default sqlPool; 