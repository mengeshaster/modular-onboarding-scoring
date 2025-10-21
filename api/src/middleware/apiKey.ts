import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logger } from '../logger';

export function apiKeyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.header('x-api-key');

  if (!apiKey) {
    logger.warn('API request without API key', { ip: req.ip, path: req.path });
    res.status(401).json({
      error: {
        code: 'MISSING_API_KEY',
        message: 'API key is required in x-api-key header',
      },
    });
    return;
  }

  if (apiKey !== config.apiKey) {
    logger.warn('API request with invalid API key', { ip: req.ip, path: req.path });
    res.status(401).json({
      error: {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key provided',
      },
    });
    return;
  }

  next();
}