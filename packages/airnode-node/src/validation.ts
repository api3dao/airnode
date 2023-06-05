import { z } from 'zod';

export const apiCallParametersSchema = z.record(z.string(), z.union([z.string(), z.array(z.any())]));
