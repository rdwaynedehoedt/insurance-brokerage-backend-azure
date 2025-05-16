import { Request, Response, NextFunction } from 'express';

/**
 * Logs all incoming requests
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Log when the request finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;
    
    console.log(
      `[${new Date().toISOString()}] ${method} ${originalUrl} ${statusCode} ${duration}ms - ${ip}`
    );
  });
  
  next();
};

/**
 * Logs errors that occur during request processing
 */
export const errorLogger = (err: Error) => {
  console.error(`[${new Date().toISOString()}] ERROR: ${err.message}`);
  console.error(err.stack);
  
  // In a production environment, you might want to log to a file or external service
  // This is where you would integrate with services like Application Insights, Winston, etc.
}; 