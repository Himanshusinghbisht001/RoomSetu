import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../utils/AppError.js';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Reusable Zod validation middleware factory.
 *
 * Usage:
 *   router.post('/rooms', validate('body', createRoomSchema), createRoomController);
 *   router.get('/rooms', validate('query', roomQuerySchema), getRoomsController);
 */
export function validate<T>(part: RequestPart, schema: z.ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      const zodError = result.error as z.ZodError;

      // Group field-level errors for the response
      const fields: Record<string, string[]> = {};
      zodError.issues.forEach((issue: z.core.$ZodIssue) => {
        const field = issue.path.join('.');
        if (!fields[field]) {
          fields[field] = [];
        }
        (fields[field] as string[]).push(issue.message);
      });

      return next(
        AppError.badRequest('Validation failed', fields),
      );
    }

    // Replace the request part with the parsed + coerced value
    (req as Request & Record<string, unknown>)[part] = result.data;
    next();
  };
}
