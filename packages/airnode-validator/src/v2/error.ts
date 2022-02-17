import { z } from 'zod';

// TODO: Customize and allow containing other properties (e.g. reason)
// TODO: Revisit the filename
export class ValidatorError extends Error {
  constructor(message: string) {
    super(message);
  }
}

// TODO: Do we want to support warnings?
// The ValidationResult object is compatible with zod "safeParse" method return value. This allows us to return the
// result of "zodSchema.safeParse" directly without wrapping the result in objects.
export type ValidationResult<T> = ValidationResultSuccess<T> | ValidationResultError;
export interface ValidationResultSuccess<T> {
  success: true;
  data: T;
}
export interface ValidationResultError {
  success: false;
  error: ValidatorError | z.ZodError<any>;
}
