import { ZodFirstPartySchemaTypes } from 'zod';

export type SchemaType<Schema extends ZodFirstPartySchemaTypes> = ReturnType<Schema['parse']>;
