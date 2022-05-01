import { z } from 'zod';
import { cloudProviderSchema } from '../config';
import { SchemaType } from '../types';
import { version as packageVersion } from '../../package.json';

export const airnodeWalletSchema = z.object({
  airnodeAddress: z.string(),
  airnodeAddressShort: z.string(),
  airnodeXpub: z.string(),
});
export type AirnodeWallet = SchemaType<typeof airnodeWalletSchema>;

export const deploymentSchema = z.object({
  nodeVersion: z.string().superRefine((version, ctx) => {
    if (version === packageVersion) return;

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `The "nodeVersion" must be ${packageVersion}`,
      path: [],
    });
  }),
  airnodeAddressShort: z.string(),
  stage: z.string(),
  cloudProvider: cloudProviderSchema,
});
export type Deployment = SchemaType<typeof deploymentSchema>;

export const apiSchema = z.object({
  httpGatewayUrl: z.string().optional(),
  heartbeatId: z.string().optional(),
});
export type Api = SchemaType<typeof apiSchema>;

export const receiptSchema = z.object({
  airnodeWallet: airnodeWalletSchema,
  deployment: deploymentSchema,
  api: apiSchema,
});
export type Receipt = SchemaType<typeof receiptSchema>;
