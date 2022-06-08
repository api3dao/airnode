import { ois as oisTypes } from '@api3/airnode-validator';

// Accessing specifically the `ois` directory so we can export the content of the `ois` module not the module itself
export * from '@api3/airnode-validator/dist/cjs/src/ois';

export function parseOIS(ois: unknown): oisTypes.OIS {
  return oisTypes.oisSchema.parse(ois);
}
