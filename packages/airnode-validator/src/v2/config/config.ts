// TODO: Dynamic checks
import { z } from 'zod';
import { oisSchema } from '../ois';
import { SchemaType } from '../types';
import { zodDiscriminatedUnion } from '../zod-discriminated-union';

export const triggerSchema = z.object({
  endpointId: z.string(),
  endpointName: z.string(),
  oisTitle: z.string(),
});
export type Trigger = SchemaType<typeof triggerSchema>;

export const triggersSchema = z.object({
  rrp: z.array(triggerSchema),
  http: z.array(triggerSchema).optional(),
});
export type Triggers = SchemaType<typeof triggersSchema>;

export const logLevelSchema = z.union([z.literal('DEBUG'), z.literal('INFO'), z.literal('WARN'), z.literal('ERROR')]);
export type LogLevel = SchemaType<typeof logLevelSchema>;

export const logFormatSchema = z.union([z.literal('json'), z.literal('plain')]);
export type LogFormat = SchemaType<typeof logFormatSchema>;

export const chainTypeSchema = z.literal('evm');
export type ChainType = SchemaType<typeof chainTypeSchema>;

export const chainContractsSchema = z.object({
  AirnodeRrp: z.string(),
});
export type ChainContracts = SchemaType<typeof chainContractsSchema>;

export const providerSchema = z.object({
  url: z.string(),
});
export type Providers = SchemaType<typeof providerSchema>;

export const priorityFeeSchema = z.object({
  value: z.string(),
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
export type PriorityFee = SchemaType<typeof priorityFeeSchema>;

export const chainOptionsSchema = z.object({
  txType: z.union([z.literal('legacy'), z.literal('eip1559')]),
  baseFeeMultiplier: z.string().optional(),
  priorityFee: priorityFeeSchema.optional(),
});
export type ChainOptions = SchemaType<typeof chainOptionsSchema>;

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
export type ChainConfig = SchemaType<typeof chainConfigSchema>;

export const httpGatewaySchema = z.object({
  enabled: z.boolean(),
  apiKey: z.string().optional(),
  maxConcurrency: z.number().optional(),
});
export type HttpGateway = SchemaType<typeof httpGatewaySchema>;

export const heartbeatSchema = z.object({
  enabled: z.boolean(),
  apiKey: z.string().optional(),
  id: z.string().optional(),
  url: z.string().optional(),
});
export type Heartbeat = SchemaType<typeof heartbeatSchema>;

export const localProviderSchema = z.object({
  type: z.literal('local'),
});
export type LocalProvider = SchemaType<typeof localProviderSchema>;

export const awsCloudProviderSchema = z.object({
  type: z.literal('aws'),
  region: z.string(),
  disableConcurrencyReservations: z.boolean(),
});
export type AwsCloudProvider = SchemaType<typeof awsCloudProviderSchema>;

export const gcpCloudProviderSchema = z.object({
  type: z.literal('gcp'),
  region: z.string(),
  projectId: z.string(),
  disableConcurrencyReservations: z.boolean(),
});
export type GcpCloudProvider = SchemaType<typeof gcpCloudProviderSchema>;

export const cloudProviderSchema = zodDiscriminatedUnion('type', [awsCloudProviderSchema, gcpCloudProviderSchema]);
export type CloudProvider = SchemaType<typeof cloudProviderSchema>;

export const localOrCloudProviderSchema = z.union([localProviderSchema, cloudProviderSchema]);
export type LocalOrCloudProvider = SchemaType<typeof localOrCloudProviderSchema>;

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
export type NodeSettings = SchemaType<typeof nodeSettingsSchema>;

export const baseApiCredentialsSchema = z.object({
  securitySchemeName: z.string(),
  securitySchemeValue: z.string(),
});
export type BaseApiCredentials = SchemaType<typeof baseApiCredentialsSchema>;

export const apiCredentialsSchema = baseApiCredentialsSchema.extend({
  oisTitle: z.string(),
});
export type ApiCredentials = SchemaType<typeof apiCredentialsSchema>;

export const configSchema = z.object({
  chains: z.array(chainConfigSchema),
  nodeSettings: nodeSettingsSchema,
  ois: z.array(oisSchema),
  triggers: triggersSchema,
  apiCredentials: z.array(apiCredentialsSchema),
});
export type Config = SchemaType<typeof configSchema>;
