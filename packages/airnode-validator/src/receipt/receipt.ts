import { z } from 'zod';
import * as ethers from 'ethers';
import { availableCloudProviders, cloudProviderSchema } from '../config';
import { SchemaType } from '../types';
import { version as packageVersion } from '../../package.json';

// https://stackoverflow.com/a/3143231
const ISO_DATE_REGEX =
  /^(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))$/;

export const airnodeWalletSchema = z
  .object({
    airnodeAddress: z.string(),
    airnodeXpub: z.string(),
  })
  .strict()
  .superRefine(({ airnodeAddress }, ctx) => {
    if (!ethers.utils.isAddress(airnodeAddress)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Airnode address is not a valid address',
        path: ['airnodeAddress'],
      });

      return;
    }
  });

export const deploymentSchema = z
  .object({
    // We're not checking whether the deployment ID is actually constructed correctly, we do that on the deployer side
    // It's that way to avoid either having two version of the same function (`hashDeployment`) or keeping it here in
    // the validator which doesn't really makes much sense
    deploymentId: z.string().regex(new RegExp(`(${availableCloudProviders.join('|')})[a-f0-9]{8}`)),
    nodeVersion: z.string().superRefine((version, ctx) => {
      if (version === packageVersion) return;

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `The "nodeVersion" must be ${packageVersion}`,
        path: [],
      });
    }),
    stage: z.string().regex(/^[a-z0-9-]{1,16}$/),
    cloudProvider: cloudProviderSchema,
    timestamp: z.string().regex(ISO_DATE_REGEX),
  })
  .strict();

export const receiptSchema = z
  .object({
    airnodeWallet: airnodeWalletSchema,
    deployment: deploymentSchema,
    success: z.boolean(),
  })
  .strict();

export type AirnodeWallet = SchemaType<typeof airnodeWalletSchema>;
export type Deployment = SchemaType<typeof deploymentSchema>;
export type Receipt = SchemaType<typeof receiptSchema>;
