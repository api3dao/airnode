import { ZodFirstPartySchemaTypes, RefinementCtx } from 'zod';

export type SchemaType<Schema extends ZodFirstPartySchemaTypes> = ReturnType<Schema['parse']>;

export type ValidatorRefinement<T> = (arg: T, ctx: RefinementCtx) => void;
