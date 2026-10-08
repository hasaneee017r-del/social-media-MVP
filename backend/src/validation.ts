import type { Response } from 'express';
import type { ZodError } from 'zod';

/** Sends a 400 with the first issue as `error` and all issues keyed by field. */
export function validationError(res: Response, error: ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    fields[key] ??= issue.message;
  }
  return res.status(400).json({ error: error.issues[0]?.message ?? 'Invalid request', fields });
}
