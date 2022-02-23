import { z } from 'zod';
import { ValidationResult } from './validation-result';

it('validationResult is compatible with zod safeParse', () => {
  const schema = z.string();
  const res = schema.safeParse('str');

  const api3ValidationResult: ValidationResult<string> = res;
  expect(api3ValidationResult.success).toBe(true);
});
