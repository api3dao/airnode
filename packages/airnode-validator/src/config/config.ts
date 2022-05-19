import { z } from 'zod';
import { ethers } from 'ethers';
import { oisSchema } from '../ois';
import { version as packageVersion } from '../../package.json';

export const triggerSchema = z.object({
  endpointId: z.string(),
  endpointName: z.string(),
  oisTitle: z.string(),
});

export const triggersSchema = z.object({
  rrp: z.array(triggerSchema),
  http: z.array(triggerSchema).optional(),
  httpSignedData: z.array(triggerSchema),
});

export const evmAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
export const evmTemplateIdSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/);
export const evmEndpointIdSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/);

export const templateSchema = z.object({
  templateId: evmTemplateIdSchema,
  endpointId: evmEndpointIdSchema,
  encodedParameters: z.string(),
});

export const logLevelSchema = z.union([z.literal('DEBUG'), z.literal('INFO'), z.literal('WARN'), z.literal('ERROR')]);

export const logFormatSchema = z.union([z.literal('json'), z.literal('plain')]);

export const chainTypeSchema = z.literal('evm');

export const chainContractsSchema = z.object({
  AirnodeRrp: evmAddressSchema,
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
  gasPriceMultiplier: z.number().optional(),
  baseFeeMultiplier: z.number().int().optional(),
  priorityFee: priorityFeeSchema.optional(),
  fulfillmentGasLimit: z.number().int(),
});

export const chainConfigSchema = z.object({
  authorizers: z.array(z.string()),
  blockHistoryLimit: z.number().optional(),
  contracts: chainContractsSchema,
  id: z.string(),
  minConfirmations: z.number().optional(),
  type: chainTypeSchema,
  options: chainOptionsSchema,
  providers: z.record(providerSchema),
  maxConcurrency: z.number(),
});

export const gatewaySchema = z.object({
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

export const cloudProviderSchema = z.discriminatedUnion('type', [awsCloudProviderSchema, gcpCloudProviderSchema]);

export const localOrCloudProviderSchema = z.union([localProviderSchema, cloudProviderSchema]);

export const nodeSettingsSchema = z
  .object({
    airnodeWalletMnemonic: z.string(),
    heartbeat: heartbeatSchema,
    httpGateway: gatewaySchema,
    httpSignedDataGateway: gatewaySchema,
    airnodeAddressShort: z.string().optional(),
    stage: z.string(),
    cloudProvider: localOrCloudProviderSchema,
    logFormat: logFormatSchema,
    logLevel: logLevelSchema,
    nodeVersion: z.string().superRefine((version, ctx) => {
      if (version === packageVersion) return;

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `The "nodeVersion" must be ${packageVersion}`,
        path: [],
      });
    }),
  })
  .superRefine((settings, ctx) => {
    const { cloudProvider, httpGateway, httpSignedDataGateway } = settings;
    if (cloudProvider.type === 'aws' && httpGateway.apiKey === httpSignedDataGateway.apiKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Using the same gateway keys is not allowed on AWS`,
        path: [],
      });
    }
  });

export const baseApiCredentialsSchema = z.object({
  securitySchemeName: z.string(),
  securitySchemeValue: z.string(),
});

export const apiCredentialsSchema = baseApiCredentialsSchema.extend({
  oisTitle: z.string(),
});

export const configSchema = z
  .object({
    chains: z.array(chainConfigSchema),
    nodeSettings: nodeSettingsSchema,
    ois: z.array(oisSchema),
    triggers: triggersSchema,
    templates: z.array(templateSchema),
    apiCredentials: z.array(apiCredentialsSchema),
  })
  .superRefine((config, ctx) => {
    if (config.templates) {
      config.templates.forEach((template) => {
        // Verify that a V0/RRP templates are valid by hashing the airnodeAddress,
        // endpointId and encodedParameters
        const airnodeAddress = ethers.Wallet.fromMnemonic(config.nodeSettings.airnodeWalletMnemonic).address;
        const derivedTemplateId = ethers.utils.solidityKeccak256(
          ['address', 'bytes32', 'bytes'],
          [airnodeAddress, template.endpointId, template.encodedParameters]
        );
        if (derivedTemplateId !== template.templateId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Template is invalid`,
            path: [template.templateId],
          });
        }
      });
    }
  });
