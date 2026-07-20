import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  console.error('[Error]', err.message);
  console.error(err.stack);

  if (err.name === 'ZodError') {
    res.status(400).json({
      error: 'Validation error',
      details: JSON.parse(err.message),
    });
    return;
  }

  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({ error: 'Token expired' });
    return;
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
};
