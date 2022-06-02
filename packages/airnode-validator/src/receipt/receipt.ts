import { z } from 'zod';
import * as ethers from 'ethers';
import { cloudProviderSchema } from '../config';
import { SchemaType } from '../types';
import { version as packageVersion } from '../../package.json';

// https://stackoverflow.com/a/3143231
const ISO_DATE_REGEX =
  /^(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))$/;

export const airnodeWalletSchema = z
  .object({
    airnodeAddress: z.string(),
    airnodeAddressShort: z.string(),
    airnodeXpub: z.string(),
  })
  .strict()
  .superRefine(({ airnodeAddress, airnodeAddressShort }, ctx) => {
    if (!ethers.utils.isAddress(airnodeAddress)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Airnode address is not a valid address',
        path: ['airnodeAddress'],
      });

      return;
    }

    if (airnodeAddress.substring(2, 9).toLowerCase() !== airnodeAddressShort) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Short Airnode address doesn't match Airnode address`,
        path: ['airnodeAddressShort'],
      });
    }
  });

export const deploymentSchema = z
  .object({
    nodeVersion: z.string().superRefine((version, ctx) => {
      if (version === packageVersion) return;

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `The "nodeVersion" must be ${packageVersion}`,
        path: [],
      });
    }),
    airnodeAddressShort: z.string(),
    stage: z.string().regex(/^[a-z0-9-]{1,16}$/),
    cloudProvider: cloudProviderSchema,
    timestamp: z.string().regex(ISO_DATE_REGEX),
  })
  .strict();

export const apiSchema = z
  .object({
    heartbeatId: z.string().optional(),
    httpGatewayUrl: z.string().url().optional(),
    httpSignedDataGatewayUrl: z.string().url().optional(),
  })
  .strict();

export const receiptSchema = z
  .object({
    airnodeWallet: airnodeWalletSchema,
    deployment: deploymentSchema,
    api: apiSchema,
  })
  .strict()
  .superRefine(({ airnodeWallet, deployment }, ctx) => {
    // TODO: There's no need to have Arnode short address twice in the receipt.json
    if (airnodeWallet.airnodeAddressShort !== deployment.airnodeAddressShort) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Airnode short addresses don't match`,
        path: ['airnodeWallet', 'airnodeAddressShort'],
      });
    }
  });

export type AirnodeWallet = SchemaType<typeof airnodeWalletSchema>;
export type Deployment = SchemaType<typeof deploymentSchema>;
export type Api = SchemaType<typeof apiSchema>;
export type Receipt = SchemaType<typeof receiptSchema>;
