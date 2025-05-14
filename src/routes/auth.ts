import { Router, Request, Response } from 'express';
import sqlPool from '../config/database';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// Login route
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Get connection from pool
    const pool = await sqlPool;
    
    // Get user from database
    const result = await pool.request()
      .input('email', email)
      .query('SELECT * FROM users WHERE email = @email');
    
    const user = result.recordset[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if account is active
    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Account is not active. Please contact administrator.' });
    }

    // Update last login
    await pool.request()
      .input('id', user.id)
      .query('UPDATE users SET last_login = GETDATE() WHERE id = @id');

    // Generate token
    const token = generateToken(user.id, user.role);

    // Return user data and token
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Get connection from pool
    const pool = await sqlPool;
    
    const result = await pool.request()
      .input('userId', req.user?.userId)
      .query('SELECT id, email, first_name, last_name, role FROM users WHERE id = @userId');

    const user = result.recordset[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new user (admin only)
router.post('/users', authenticate, authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, role, phoneNumber } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Get connection from pool
    const pool = await sqlPool;
    
    // Check if email already exists
    const existingUser = await pool.request()
      .input('email', email)
      .query('SELECT id FROM users WHERE email = @email');

    if (existingUser.recordset.length > 0) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Insert user
    const result = await pool.request()
      .input('email', email)
      .input('password', hashedPassword)
      .input('firstName', firstName)
      .input('lastName', lastName)
      .input('role', role)
      .input('phoneNumber', phoneNumber || null)
      .input('status', 'active')
      .query(`
        INSERT INTO users (email, password, first_name, last_name, role, phone_number, status)
        VALUES (@email, @password, @firstName, @lastName, @role, @phoneNumber, @status);
        SELECT SCOPE_IDENTITY() AS id;
      `);

    res.status(201).json({
      message: 'User created successfully',
      userId: result.recordset[0].id
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 