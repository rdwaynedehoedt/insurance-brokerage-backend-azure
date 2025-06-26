import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    role: string;
    exp?: number;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log(`[Auth] Missing or invalid Authorization header: ${req.path}`);
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
      console.log(`[Auth] Empty token: ${req.path}`);
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < currentTime) {
      console.log(`[Auth] Expired token: ${req.path}, expired at ${new Date(decoded.exp * 1000).toISOString()}`);
      return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    
    req.user = decoded;
    
    console.log(`[Auth] Authenticated user ${decoded.userId} (${decoded.role}) for ${req.method} ${req.path}`);
    
    next();
  } catch (error) {
    console.error(`[Auth] Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      console.log(`[Auth] Authorization failed: No user found in request`);
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      console.log(`[Auth] Authorization failed: User ${req.user.userId} with role ${req.user.role} attempted to access resource requiring ${roles.join(', ')}`);
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    console.log(`[Auth] Authorized user ${req.user.userId} with role ${req.user.role} for ${req.method} ${req.path}`);
    next();
  };
};

export const publicEndpoint = (_req: Request, _res: Response, next: NextFunction) => {
  next();
}; 