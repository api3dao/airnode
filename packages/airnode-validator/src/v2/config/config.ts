import { z } from 'zod';
import { oisSchema } from '../ois';
import { zodDiscriminatedUnion } from '../zod-discriminated-union';

export const triggerSchema = z.object({
  endpointId: z.string(),
  endpointName: z.string(),
  oisTitle: z.string(),
});

export const triggersSchema = z.object({
  rrp: z.array(triggerSchema),
  http: z.array(triggerSchema).optional(),
});

export const logLevelSchema = z.union([z.literal('DEBUG'), z.literal('INFO'), z.literal('WARN'), z.literal('ERROR')]);

export const logFormatSchema = z.union([z.literal('json'), z.literal('plain')]);

export const chainTypeSchema = z.literal('evm');

export const chainContractsSchema = z.object({
  AirnodeRrp: z.string(),
});

export const providerSchema = z.object({
  url: z.string().url(),
});

export const priorityFeeSchema = z.object({
  value: z.number(),
  unit: z
    .union([
      z.literal('wei'),
      z.literal('kwei'),
      z.literal('mwei'),
      z.literal('gwei'),
      z.literal('szabo'),
      z.literal('finney'),
      z.literal('ether'),
    ])
    .optional(),
});

export const chainOptionsSchema = z.object({
  txType: z.union([z.literal('legacy'), z.literal('eip1559')]),
  baseFeeMultiplier: z.number().int().optional(),
  priorityFee: priorityFeeSchema.optional(),
});

export const chainConfigSchema = z.object({
  authorizers: z.array(z.string()),
  blockHistoryLimit: z.number().optional(),
  contracts: chainContractsSchema,
  id: z.string(),
  ignoreBlockedRequestsAfterBlocks: z.number().optional(),
  minConfirmations: z.number().optional(),
  type: chainTypeSchema,
  options: chainOptionsSchema,
  providers: z.record(providerSchema),
  maxConcurrency: z.number(),
});

export const httpGatewaySchema = z.object({
  enabled: z.boolean(),
  apiKey: z.string().optional(),
  maxConcurrency: z.number().optional(),
});

export const heartbeatSchema = z.object({
  enabled: z.boolean(),
  apiKey: z.string().optional(),
  id: z.string().optional(),
  url: z.string().optional(),
});

export const localProviderSchema = z.object({
  type: z.literal('local'),
});

export const awsCloudProviderSchema = z.object({
  type: z.literal('aws'),
  region: z.string(),
  disableConcurrencyReservations: z.boolean(),
});

export const gcpCloudProviderSchema = z.object({
  type: z.literal('gcp'),
  region: z.string(),
  projectId: z.string(),
  disableConcurrencyReservations: z.boolean(),
});

export const cloudProviderSchema = zodDiscriminatedUnion('type', [awsCloudProviderSchema, gcpCloudProviderSchema]);

export const localOrCloudProviderSchema = z.union([localProviderSchema, cloudProviderSchema]);

export const nodeSettingsSchema = z.object({
  airnodeWalletMnemonic: z.string(),
  heartbeat: heartbeatSchema,
  httpGateway: httpGatewaySchema,
  airnodeAddressShort: z.string().optional(),
  stage: z.string(),
  cloudProvider: localOrCloudProviderSchema,
  logFormat: logFormatSchema,
  logLevel: logLevelSchema,
  // TODO: This must match validator version
  nodeVersion: z.string(),
  // TODO: https://api3dao.atlassian.net/browse/AN-556
  skipValidation: z.boolean().optional(),
});

export const baseApiCredentialsSchema = z.object({
  securitySchemeName: z.string(),
  securitySchemeValue: z.string(),
});

export const apiCredentialsSchema = baseApiCredentialsSchema.extend({
  oisTitle: z.string(),
});

export const configSchema = z.object({
  chains: z.array(chainConfigSchema),
  nodeSettings: nodeSettingsSchema,
  ois: z.array(oisSchema),
  triggers: triggersSchema,
  apiCredentials: z.array(apiCredentialsSchema),
});
