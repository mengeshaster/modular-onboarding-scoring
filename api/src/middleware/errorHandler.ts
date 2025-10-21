import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../logger';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Error in request:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err.errors,
      },
    });
    return;
  }

  // Custom application errors
  if (err.code && err.message) {
    const statusCode = getStatusCodeFromErrorCode(err.code);
    res.status(statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // Database errors
  if (err.code === '23505') { // Unique constraint violation
    res.status(409).json({
      error: {
        code: 'DUPLICATE_RESOURCE',
        message: 'Resource already exists',
      },
    });
    return;
  }

  // Default server error
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}

function getStatusCodeFromErrorCode(code: string): number {
  const statusMap: Record<string, number> = {
    'NOT_FOUND': 404,
    'UNAUTHORIZED': 401,
    'FORBIDDEN': 403,
    'BAD_REQUEST': 400,
    'SCORER_UNREACHABLE': 502,
    'INVALID_INPUT': 400,
  };

  return statusMap[code] || 500;
}