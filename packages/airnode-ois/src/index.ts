import { ois as oisModule } from '@api3/airnode-validator';
import { OIS } from './types';

export * from './types';
export * from './constants';

// NOTE: The main purpose of this function is to make sure that the validator schema inferred from Zod (used internally
// in validator) is compatible with our manually defined OIS types.
export function parseOIS(ois: unknown): OIS {
  return oisModule.oisSchema.parse(ois);
}

// Exports OIS schemas
export { ois } from '@api3/airnode-validator';
