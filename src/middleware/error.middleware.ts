import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log the error
  if (statusCode >= 500) {
    logger.error(`Server Error: ${message}`, {
      stack: err.stack,
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query
    });
  } else {
    logger.warn(`Client Error: ${message}`, {
      path: req.path,
      method: req.method,
      statusCode
    });
  }
  
  // Don't leak error details in production
  const responseMessage = statusCode >= 500 && process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : message;
  
  const responseStack = statusCode >= 500 && process.env.NODE_ENV !== 'production'
    ? err.stack
    : undefined;
  
  res.status(statusCode).json({
    success: false,
    error: {
      message: responseMessage,
      ...(responseStack && { stack: responseStack })
    }
  });
};

export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string) {
    super(message, 409);
  }
}

