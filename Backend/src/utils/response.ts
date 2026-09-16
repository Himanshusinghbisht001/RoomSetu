import { Response } from 'express';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
}

export interface ApiPaginated<T = unknown> {
  success: true;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ---------------------------------------------------------------------------
// Success helpers
// ---------------------------------------------------------------------------

/**
 * Send a standard success response.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
): void {
  const body: ApiSuccess<T> = { success: true, data };
  res.status(statusCode).json(body);
}

/**
 * Send a paginated success response.
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: { total: number; page: number; limit: number },
): void {
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const body: ApiPaginated<T> = {
    success: true,
    data,
    pagination: { ...pagination, totalPages },
  };
  res.status(200).json(body);
}

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

/**
 * Send a standard error response.
 */
export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  fields?: Record<string, string[]>,
): void {
  const body: ApiError = {
    success: false,
    error: { code, message, ...(fields ? { fields } : {}) },
  };
  res.status(statusCode).json(body);
}
