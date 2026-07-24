import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

export const errorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    details = err.issues.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
  }
  // Handle Prisma Known Request Errors
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      message = 'Unique constraint violation. A record with that identifier already exists.';
      details = { target: err.meta?.target };
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Record not found.';
    } else {
      statusCode = 400;
      message = `Database Error: ${err.message}`;
    }
  }
  // Handle AppError
  else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  }

  // Log error
  if (statusCode >= 500) {
    logger.error(
      {
        method: req.method,
        url: req.originalUrl,
        status: statusCode,
        message,
        stack: env.NODE_ENV === 'development' ? err.stack : undefined,
      },
      'Unhandled Server Error'
    );
  } else {
    logger.warn(
      {
        method: req.method,
        url: req.originalUrl,
        status: statusCode,
        message,
      },
      'Client API Error'
    );
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      ...(details && { details }),
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
