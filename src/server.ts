import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';
import documentsRoutes from './routes/documents';
import { errorLogger, requestLogger } from './middleware/logging';
import db, { getPoolStats, keepConnectionWarm } from './config/database';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, authorize, AuthRequest } from './middleware/auth';
import { Client, ClientData } from './models/Client';
import csv from 'csv-parser';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({ dest: uploadsDir });

// Middleware
const corsOptions = {
  origin: isProduction 
    ? process.env.CORS_ORIGIN || 'https://your-production-domain.com'
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Allow cookies to be sent with requests
  exposedHeaders: ['Content-Type', 'Content-Disposition'], // Expose headers for download
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
app.use(helmet()); // Security headers
app.use(compression()); // Gzip compression
app.use(express.json());
app.use(requestLogger); // Log all requests

// Add a diagnostic endpoint to see what paths are being received
app.get('/path-test', (req: Request, res: Response) => {
  const pathInfo = {
    originalUrl: req.originalUrl,
    path: req.path,
    baseUrl: req.baseUrl,
    url: req.url,
    headers: req.headers,
    method: req.method,
    query: req.query,
  };
  
  console.log('Path test endpoint called with:', JSON.stringify(pathInfo, null, 2));
  
  res.status(200).json({
    message: 'Path test endpoint',
    pathInfo
  });
});

// Add DB connectivity check middleware for critical endpoints
const checkDatabaseConnection = async (req: Request, res: Response, next: NextFunction) => {
  // Only check on auth endpoints
  if (req.path.startsWith('/api/auth')) {
    try {
      await db.ensureConnection();
      next();
    } catch (err) {
      console.error('Database connectivity check failed:', err);
      return res.status(503).json({
        message: 'Database service unavailable, please try again later',
        error: isProduction ? undefined : (err instanceof Error ? err.message : String(err))
      });
    }
  } else {
    // Skip check for non-critical endpoints
    next();
  }
};

// Apply the database check middleware
app.use(checkDatabaseConnection);

// TODO: Implement rate limiting for sensitive endpoints, especially login
// Example setup for rate limiting (uncomment and install 'express-rate-limit' package)
/*
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to login endpoint
app.use('/api/auth/login', loginLimiter);
*/

// Remove test routes in production
/*
if (!isProduction) {
  const testRoutes = require('./routes/test').default;
  app.use('/api', testRoutes);
}
*/

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/documents', documentsRoutes);

// Direct route for CSV import to avoid nesting issues in some cloud environments
app.post('/api/import-csv', authenticate, authorize(['admin', 'manager', 'sales']), upload.single('file'), async (req: AuthRequest & { file?: Express.Multer.File }, res: Response) => {
  console.log('CSV import direct route called');
  
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    const results: ClientData[] = [];
    const requiredFields = ['customer_type', 'product', 'insurance_provider', 'client_name', 'mobile_no'];
    let headerValidated = false;
    let hasRequiredFields = true;
    let missingFields: string[] = [];

    // Process the CSV file
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(req.file!.path)
        .pipe(csv())
        .on('headers', (headers: string[]) => {
          // Validate that the CSV has the required fields
          requiredFields.forEach(field => {
            if (!headers.includes(field)) {
              hasRequiredFields = false;
              missingFields.push(field);
            }
          });
          headerValidated = true;
        })
        .on('data', (data) => {
          const clientData: Partial<ClientData> = {};

          // Map CSV data to client data
          Object.keys(data).forEach(key => {
            // Handle numeric fields
            const numericFields = [
              'sum_insured', 'basic_premium', 'srcc_premium', 'tc_premium', 
              'net_premium', 'stamp_duty', 'admin_fees', 'road_safety_fee', 
              'policy_fee', 'vat_fee', 'total_invoice', 'commission_basic',
              'commission_srcc', 'commission_tc'
            ];
            
            // Handle date fields
            const dateFields = [
              'policy_period_from', 'policy_period_to'
            ];
            
            if (numericFields.includes(key) && data[key]) {
              // Convert to number and handle empty strings
              (clientData as any)[key] = data[key] ? parseFloat(data[key]) : 0;
            } else if (dateFields.includes(key) && data[key]) {
              // Parse dates
              try {
                const date = new Date(data[key]);
                // Check if date is valid
                if (!isNaN(date.getTime())) {
                  (clientData as any)[key] = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
                } else {
                  (clientData as any)[key] = data[key]; // Keep original if parsing fails
                }
              } catch (err) {
                console.warn(`Error parsing date for ${key}:`, err);
                (clientData as any)[key] = data[key]; // Keep original if parsing fails
              }
            } else {
              (clientData as any)[key] = data[key];
            }
          });

          // Validate required fields for each row
          const rowMissingFields = requiredFields.filter(field => 
            !clientData[field as keyof ClientData] || 
            clientData[field as keyof ClientData] === ''
          );

          if (rowMissingFields.length === 0) {
            results.push(clientData as ClientData);
          }
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (error) => {
          reject(error);
        });
    });

    // Check if headers are valid
    if (!hasRequiredFields) {
      return res.status(400).json({ 
        success: false, 
        message: `CSV is missing required fields: ${missingFields.join(', ')}` 
      });
    }

    // If we have valid data, insert the clients
    const createdClients: string[] = [];
    for (const clientData of results) {
      try {
        const clientId = await Client.create(clientData);
        createdClients.push(clientId);
      } catch (error) {
        console.error('Error creating client from CSV:', error);
        // Continue with the next client
      }
    }

    // Clean up the uploaded file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting temp file:', err);
    });

    res.status(200).json({ 
      success: true, 
      message: `Successfully imported ${createdClients.length} clients`, 
      count: createdClients.length,
      ids: createdClients
    });

  } catch (error) {
    console.error('Error processing CSV file:', error);
    
    // Clean up the uploaded file if it exists
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process CSV file',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Insurance Brokerage API',
    version: '1.0.0',
    status: 'running'
  });
});

// Health check endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    // Check database connectivity
    await db.getConnection();
    res.status(200).json({ status: 'ok', database_connection: 'ok' });
  } catch (error) {
    console.error('Health check detected database issue:', error);
    res.status(200).json({ 
      status: 'degraded', 
      database_connection: 'error', 
      details: isProduction ? undefined : (error instanceof Error ? error.message : String(error))
    });
  }
});

// Metrics endpoint (for internal monitoring)
app.get('/api/metrics', async (req: Request, res: Response) => {
  try {
    res.status(200).json({
      timestamp: new Date().toISOString(),
      db_pool: getPoolStats(),
      memory_usage: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024), // RSS in MB
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), // Heap total in MB
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // Heap used in MB
        external: Math.round(process.memoryUsage().external / 1024 / 1024) // External in MB
      },
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Metrics endpoint error:', error);
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  errorLogger(err);
  res.status(500).json({
    error: isProduction ? 'Internal Server Error' : err.message
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Setup more aggressive keep-alive mechanism to prevent cold starts
const KEEP_ALIVE_INTERVAL = isProduction ? 2 * 60 * 1000 : 5 * 60 * 1000; // 2 minutes in prod, 5 minutes in dev
setInterval(() => {
  keepConnectionWarm()
    .then(success => {
      if (!success) {
        console.warn('Database keep-alive failed');
      }
    })
    .catch(err => {
      console.error('Error in keep-alive mechanism:', err);
    });
}, KEEP_ALIVE_INTERVAL);

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
  
  // Initial connection check
  db.ensureConnection()
    .then(() => console.log('Database connection verified on startup'))
    .catch(err => console.error('Database connection failed on startup, will retry later:', err));
}); 