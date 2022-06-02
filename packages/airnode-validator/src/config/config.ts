import { ethers } from 'ethers';
import { SuperRefinement, z } from 'zod';
import forEach from 'lodash/forEach';
import { version as packageVersion } from '../../package.json';
import { OIS, oisSchema } from '../ois';
import { SchemaType } from '../types';

export const evmAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
export const evmIdSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/);

export const triggerSchema = z
  .object({
    endpointId: evmIdSchema,
    endpointName: z.string(),
    oisTitle: z.string(),
  })
  .strict();

export const triggersSchema = z
  .object({
    rrp: z.array(triggerSchema),
    http: z.array(triggerSchema),
    httpSignedData: z.array(triggerSchema),
  })
  .strict();

export const templateSchema = z
  .object({
    templateId: evmIdSchema,
    endpointId: evmIdSchema,
    encodedParameters: z.string(),
  })
  .strict();

export const logLevelSchema = z.union([z.literal('DEBUG'), z.literal('INFO'), z.literal('WARN'), z.literal('ERROR')]);

export const logFormatSchema = z.union([z.literal('json'), z.literal('plain')]);

export const chainTypeSchema = z.literal('evm');

export const chainContractsSchema = z
  .object({
    AirnodeRrp: evmAddressSchema,
  })
  .strict();

export const providerSchema = z
  .object({
    url: z.string().url(),
  })
  .strict();

export const amountSchema = z
  .object({
    value: z.number().lte(9007199254740991), // 2**53 - 1
    unit: z.union([
      z.literal('wei'),
      z.literal('kwei'),
      z.literal('mwei'),
      z.literal('gwei'),
      z.literal('szabo'),
      z.literal('finney'),
      z.literal('ether'),
    ]),
  })
  .strict();

const chainOptionsErrorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.unrecognized_keys) {
    return {
      message: `Unrecognized or disallowed key(s) for the given transaction type: ${issue.keys
        .map((val) => `'${val}'`)
        .join(', ')}`,
    };
  }
  return { message: ctx.defaultError };
};

export const chainOptionsSchema = z.discriminatedUnion('txType', [
  z
    .object(
      {
        txType: z.literal('eip1559'),
        baseFeeMultiplier: z.number().int().optional(),
        priorityFee: amountSchema.optional(),
        fulfillmentGasLimit: z.number().int(),
        withdrawalRemainder: amountSchema.optional(),
      },
      { errorMap: chainOptionsErrorMap }
    )
    .strict(),
  z
    .object(
      {
        txType: z.literal('legacy'),
        gasPriceMultiplier: z.number().optional(),
        fulfillmentGasLimit: z.number().int(),
        withdrawalRemainder: amountSchema.optional(),
      },
      { errorMap: chainOptionsErrorMap }
    )
    .strict(),
]);

export const chainConfigSchema = z
  .object({
    authorizers: z.array(evmAddressSchema),
    blockHistoryLimit: z.number().optional(),
    contracts: chainContractsSchema,
    id: z.string(),
    minConfirmations: z.number().optional(),
    type: chainTypeSchema,
    options: chainOptionsSchema,
    providers: z.record(providerSchema),
    maxConcurrency: z.number().int(),
  })
  .strict();

export const apiKeySchema = z.string().min(30).max(120);

export const enabledGatewaySchema = z
  .object({
    enabled: z.literal(true),
    apiKey: apiKeySchema,
    maxConcurrency: z.number(),
  })
  .strict();

export const disabledGatewaySchema = z
  .object({
    enabled: z.literal(false),
  })
  .strict();

export const gatewaySchema = z.discriminatedUnion('enabled', [enabledGatewaySchema, disabledGatewaySchema]);

export const enabledHeartbeatSchema = z
  .object({
    enabled: z.literal(true),
    apiKey: apiKeySchema,
    id: z.string(),
    url: z.string(),
  })
  .strict();

export const disabledHeartbeatSchema = z
  .object({
    enabled: z.literal(false),
  })
  .strict();

export const heartbeatSchema = z.discriminatedUnion('enabled', [enabledHeartbeatSchema, disabledHeartbeatSchema]);

export const localProviderSchema = z
  .object({
    type: z.literal('local'),
  })
  .strict();

export const awsCloudProviderSchema = z
  .object({
    type: z.literal('aws'),
    region: z.string(),
    disableConcurrencyReservations: z.boolean(),
  })
  .strict();

export const gcpCloudProviderSchema = z
  .object({
    type: z.literal('gcp'),
    region: z.string(),
    projectId: z.string(),
    disableConcurrencyReservations: z.boolean(),
  })
  .strict();

export const cloudProviderSchema = z.discriminatedUnion('type', [awsCloudProviderSchema, gcpCloudProviderSchema]);

export const localOrCloudProviderSchema = z.union([localProviderSchema, cloudProviderSchema]);

export const nodeSettingsSchema = z
  .object({
    airnodeWalletMnemonic: z.string(),
    heartbeat: heartbeatSchema,
    httpGateway: gatewaySchema,
    httpSignedDataGateway: gatewaySchema,
    airnodeAddressShort: z.string().optional(),
    stage: z.string().regex(/^[a-z0-9-]{1,16}$/),
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
  .strict()
  .superRefine((settings, ctx) => {
    const { cloudProvider, httpGateway, httpSignedDataGateway } = settings;
    if (
      cloudProvider.type === 'aws' &&
      httpGateway.enabled &&
      httpSignedDataGateway.enabled &&
      httpGateway.apiKey === httpSignedDataGateway.apiKey
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Using the same gateway keys is not allowed on AWS`,
        path: [],
      });
    }
  });

export const baseApiCredentialsSchema = z
  .object({
    securitySchemeName: z.string(),
    securitySchemeValue: z.string(),
  })
  .strict();

export const apiCredentialsSchema = baseApiCredentialsSchema
  .extend({
    oisTitle: z.string(),
  })
  .strict();

const validateSecuritySchemesReferences: SuperRefinement<{
  ois: OIS[];
  apiCredentials: ApiCredentials[];
}> = (config, ctx) => {
  config.ois.forEach((ois, index) => {
    Object.keys(ois.apiSpecifications.security).forEach((enabledSecuritySchemeName) => {
      const enabledSecurityScheme = ois.apiSpecifications.components.securitySchemes[enabledSecuritySchemeName];
      if (enabledSecurityScheme && ['apiKey', 'http'].includes(enabledSecurityScheme.type)) {
        const securitySchemeApiCredentials = config.apiCredentials.find(
          (apiCredentials) => apiCredentials.securitySchemeName === enabledSecuritySchemeName
        );
        if (!securitySchemeApiCredentials) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `The security scheme is enabled but no credentials are provided in "apiCredentials"`,
            path: ['ois', index, 'apiSpecifications', 'security', enabledSecuritySchemeName],
          });
        }
      }
    });
  });
};

const validateTemplateSchemes: SuperRefinement<{
  nodeSettings: NodeSettings;
  templates: Template[];
}> = (config, ctx) => {
  if (config.templates) {
    config.templates.forEach((template: any) => {
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
};

const validateTriggersReferences: SuperRefinement<{
  ois: OIS[];
  triggers: Triggers;
}> = (config, ctx) => {
  forEach(config.triggers, (triggers, triggerSection) => {
    forEach(triggers, (trigger, index) => {
      const { oisTitle, endpointName } = trigger;

      // Check that the OIS with the "oisTitle" from the trigger exists
      const ois = config.ois.find((ois) => ois.title === oisTitle);
      if (!ois) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `No matching OIS for trigger with OIS title "${oisTitle}"`,
          path: ['triggers', triggerSection, index, 'oisTitle'],
        });

        return;
      }

      // Check that the OIS contains an endpoint from the trigger
      const endpoint = ois.endpoints.find((endpoint) => endpoint.name === endpointName);
      if (!endpoint) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `No matching endpoint for trigger with endpoint name "${endpointName}"`,
          path: ['triggers', triggerSection, index, 'endpointName'],
        });
      }
    });
  });
};

export const configSchema = z
  .object({
    chains: z.array(chainConfigSchema),
    nodeSettings: nodeSettingsSchema,
    ois: z.array(oisSchema),
    triggers: triggersSchema,
    templates: z.array(templateSchema),
    apiCredentials: z.array(apiCredentialsSchema),
  })
  .strict()
  .superRefine(validateSecuritySchemesReferences)
  .superRefine(validateTemplateSchemes)
  .superRefine(validateTriggersReferences);

export type Config = SchemaType<typeof configSchema>;
export type ApiCredentials = SchemaType<typeof apiCredentialsSchema>;
export type NodeSettings = SchemaType<typeof nodeSettingsSchema>;
export type Template = SchemaType<typeof templateSchema>;
export type CloudProvider = SchemaType<typeof cloudProviderSchema>;
export type AwsCloudProvider = SchemaType<typeof awsCloudProviderSchema>;
export type GcpCloudProvider = SchemaType<typeof gcpCloudProviderSchema>;
export type LocalOrCloudProvider = SchemaType<typeof localOrCloudProviderSchema>;
export type Gateway = SchemaType<typeof gatewaySchema>;
export type ChainOptions = SchemaType<typeof chainOptionsSchema>;
export type ChainType = SchemaType<typeof chainTypeSchema>;
export type ChainConfig = SchemaType<typeof chainConfigSchema>;
export type Trigger = SchemaType<typeof triggerSchema>;
export type Triggers = SchemaType<typeof triggersSchema>;
export type Heartbeat = SchemaType<typeof heartbeatSchema>;
export type Amount = SchemaType<typeof amountSchema>;
