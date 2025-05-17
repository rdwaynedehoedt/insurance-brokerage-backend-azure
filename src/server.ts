import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';
import documentsRoutes from './routes/documents';
import { errorLogger, requestLogger } from './middleware/logging';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

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

// Remove test routes in production
if (!isProduction) {
  const testRoutes = require('./routes/test').default;
  app.use('/api', testRoutes);
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/documents', documentsRoutes);

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Insurance Brokerage API',
    version: '1.0.0',
    status: 'running'
  });
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
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

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
}); 