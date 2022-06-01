import { z, ZodFirstPartySchemaTypes } from 'zod';

export type SchemaType<Schema extends ZodFirstPartySchemaTypes> = z.infer<Schema>;

export type Secrets = Record<string, string | undefined>;
