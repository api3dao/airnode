import { ZodFirstPartySchemaTypes, RefinementCtx, z } from 'zod';

export type SchemaType<Schema extends ZodFirstPartySchemaTypes> = z.infer<Schema>;

export type ValidatorRefinement<T> = (arg: T, ctx: RefinementCtx) => void;
