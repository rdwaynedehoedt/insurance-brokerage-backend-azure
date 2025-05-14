import { Router, Request, Response } from 'express';
import sqlPool from '../config/database';

const router = Router();

router.get('/test-db', async (req: Request, res: Response) => {
  try {
    // Get connection from pool
    const pool = await sqlPool;
    
    // Test basic connection
    const connectionTest = await pool.request().query('SELECT 1 + 1 AS result');
    
    // Test users table
    const users = await pool.request().query('SELECT COUNT(*) as userCount FROM users');
    
    res.json({ 
      message: 'Database connection successful',
      connectionTest: connectionTest.recordset,
      users: users.recordset,
      databaseInfo: {
        server: process.env.AZURE_SQL_SERVER,
        database: process.env.AZURE_SQL_DATABASE,
        port: process.env.AZURE_SQL_PORT
      }
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ 
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 