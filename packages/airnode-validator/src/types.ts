import { RefinementCtx, z, ZodFirstPartySchemaTypes } from 'zod';
import { apiCredentialsSchema, configSchema } from './config';
import { oisSchema } from './ois';

export type SchemaType<Schema extends ZodFirstPartySchemaTypes> = z.infer<Schema>;

export type ValidatorRefinement<T> = (arg: T, ctx: RefinementCtx) => void;

export type Secrets = Record<string, string | undefined>;

export type Config = SchemaType<typeof configSchema>;
export type OIS = SchemaType<typeof oisSchema>;
export type ApiCredentials = SchemaType<typeof apiCredentialsSchema>;
