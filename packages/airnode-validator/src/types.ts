import { RefinementCtx, z, ZodFirstPartySchemaTypes } from 'zod';

export type SchemaType<Schema extends ZodFirstPartySchemaTypes> = z.infer<Schema>;

export type ValidatorRefinement<T> = (arg: T, ctx: RefinementCtx) => void;

export type Secrets = Record<string, string | undefined>;
