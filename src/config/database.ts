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
    max: Number(process.env.DB_POOL_MAX) || 10,
    min: Number(process.env.DB_POOL_MIN) || 0,
    idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_TIMEOUT) || 30000
  }
};

// Create a global pool
const pool = new mssql.ConnectionPool(config);

// Connection pool metrics
export const getPoolStats = () => {
  // Note: accessing internal pool properties - these may change in future mssql versions
  // Using any type to bypass TypeScript's type checking for these properties
  const poolAny = pool as any;
  
  return {
    size: poolAny.pool ? poolAny.pool.size : 0,
    available: poolAny.pool ? poolAny.pool.available : 0,
    borrowed: poolAny.pool ? poolAny.pool.borrowed : 0,
    pending: poolAny.pool ? poolAny.pool.pending : 0,
    max: config.pool.max,
    min: config.pool.min
  };
};

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

// TODO: Implement keep-alive mechanism to prevent cold starts
// This function should be called periodically (e.g., every 5 minutes)
// to keep the connection pool warm and prevent Azure SQL from going idle
export const keepConnectionWarm = async () => {
  try {
    const poolInstance = await sqlPool;
    const result = await poolInstance.request().query('SELECT 1 AS KeepAlive');
    console.log(`Keep-alive ping successful: ${result.recordset[0].KeepAlive === 1}`);
    return true;
  } catch (error) {
    console.error('Keep-alive ping failed:', error);
    return false;
  }
};

// Export the connection pool
export default sqlPool; 