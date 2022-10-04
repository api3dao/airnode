import { ethers } from 'ethers';
import { SuperRefinement, z } from 'zod';
import forEach from 'lodash/forEach';
import includes from 'lodash/includes';
import size from 'lodash/size';
import { goSync } from '@api3/promise-utils';
import { version as packageVersion } from '../../package.json';
import { OIS, oisSchema, RELAY_METADATA_TYPES } from '../ois';
import { SchemaType } from '../types';

export const evmAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
export const evmIdSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/);

// We use a convention for deriving endpoint ID from OIS title and endpoint name,
// but we are not enforcing the convention in docs:
// https://docs.api3.org/airnode/latest/concepts/endpoint.html#endpointid
export const endpointIdSchema = z.string();

export const triggerSchema = z
  .object({
    endpointId: endpointIdSchema,
    endpointName: z.string(),
    oisTitle: z.string(),
  })
  .strict();

export const rrpTriggerSchema = triggerSchema
  .merge(
    z.object({
      cacheResponses: z.boolean(),
    })
  )
  .strict();

export const triggersSchema = z
  .object({
    rrp: z.array(rrpTriggerSchema),
    http: z.array(triggerSchema),
    httpSignedData: z.array(triggerSchema),
  })
  .strict();

export const templateSchema = z
  .object({
    templateId: evmIdSchema,
    endpointId: endpointIdSchema,
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

export const providersSchema = z.record(z.string(), providerSchema);

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

export const latestBlockPercentileGasPriceStrategySchema = z
  .object({
    gasPriceStrategy: z.literal('latestBlockPercentileGasPrice'),
    percentile: z.number().int(),
    minTransactionCount: z.number().int(),
    pastToCompareInBlocks: z.number().int(),
    maxDeviationMultiplier: z.number(),
  })
  .strict();

export const providerRecommendedGasPriceStrategySchema = z
  .object({
    gasPriceStrategy: z.literal('providerRecommendedGasPrice'),
    recommendedGasPriceMultiplier: z.number().positive(),
  })
  .strict();

export const providerRecommendedEip1559GasPriceStrategySchema = z
  .object({
    gasPriceStrategy: z.literal('providerRecommendedEip1559GasPrice'),
    baseFeeMultiplier: z.number().int(),
    priorityFee: amountSchema,
  })
  .strict();

export const constantGasPriceStrategySchema = z
  .object({
    gasPriceStrategy: z.literal('constantGasPrice'),
    gasPrice: amountSchema,
  })
  .strict();

export const gasPriceOracleStrategySchema = z.discriminatedUnion('gasPriceStrategy', [
  latestBlockPercentileGasPriceStrategySchema,
  providerRecommendedGasPriceStrategySchema,
  providerRecommendedEip1559GasPriceStrategySchema,
  constantGasPriceStrategySchema,
]);

export const validateGasPriceOracleStrategies: SuperRefinement<GasPriceOracleConfig> = (gasPriceOracle, ctx) => {
  const constantGasPriceStrategy = gasPriceOracle.find(
    (gasPriceOracleStrategy) => gasPriceOracleStrategy.gasPriceStrategy === 'constantGasPrice'
  );

  // Require at least the constantGasPrice strategy to be defined
  if (!constantGasPriceStrategy) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Missing required constantGasPrice strategy`,
      path: ['gasPriceOracle'],
    });
  }

  if (gasPriceOracle[gasPriceOracle.length - 1]?.gasPriceStrategy !== 'constantGasPrice') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `ConstantGasPrice strategy must be set as the last strategy in the array.`,
      path: ['gasPriceOracle'],
    });
  }
};

export const gasPriceOracleSchema = z
  .array(gasPriceOracleStrategySchema)
  .nonempty()
  .superRefine(validateGasPriceOracleStrategies);

export const chainOptionsSchema = z
  .object({
    fulfillmentGasLimit: z.number().int(),
    withdrawalRemainder: amountSchema.optional(),
    gasPriceOracle: gasPriceOracleSchema,
  })
  .strict();

export const chainAuthorizationsSchema = z.object({
  requesterEndpointAuthorizations: z.record(endpointIdSchema, z.array(evmAddressSchema)),
});

// TODO: add crossChainProvider to secrets.env for testing interpolation
export const crossChainRequesterAuthorizerSchema = z.object({
  requesterEndpointAuthorizers: z.array(evmAddressSchema),
  chainType: chainTypeSchema,
  chainId: z.string(),
  contracts: chainContractsSchema,
  chainProvider: providerSchema,
});

export const chainAuthorizersSchema = z.object({
  requesterEndpointAuthorizers: z.array(evmAddressSchema),
  crossChainRequesterAuthorizers: z.array(crossChainRequesterAuthorizerSchema),
});

export const maxConcurrencySchema = z.number().int().positive();

const validateMaxConcurrency: SuperRefinement<{ providers: Providers; maxConcurrency: MaxConcurrency }> = (
  chainConfig,
  ctx
) => {
  if (chainConfig.maxConcurrency < size(chainConfig.providers)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Concurrency limit can't be lower than the number of providers for given chain`,
      path: ['maxConcurrency'],
    });
  }
};

export const chainConfigSchema = z
  .object({
    authorizers: chainAuthorizersSchema,
    authorizations: chainAuthorizationsSchema,
    blockHistoryLimit: z.number().int().optional(), // Defaults to BLOCK_COUNT_HISTORY_LIMIT defined in airnode-node
    contracts: chainContractsSchema,
    id: z.string(),
    minConfirmations: z.number().int().optional(), // Defaults to BLOCK_MIN_CONFIRMATIONS defined in airnode-node
    type: chainTypeSchema,
    options: chainOptionsSchema,
    providers: providersSchema,
    maxConcurrency: maxConcurrencySchema,
  })
  .strict()
  .superRefine(validateMaxConcurrency);

export const apiKeySchema = z.string().min(30).max(120);

export const corsOriginsSchema = z.array(z.string());

export const enabledGatewaySchema = z
  .object({
    enabled: z.literal(true),
    apiKey: apiKeySchema,
    maxConcurrency: z.number().int().positive(),
    corsOrigins: corsOriginsSchema,
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
    // Gateway server port is optional, because docker ports need to be published when starting the Airnode client
    // container. Users can bind (publish) the default port to any port they want. This property is useful if the
    // container is run in "network host" mode, where the container uses the host network natively (and no port
    // publishing is needed).
    gatewayServerPort: z.number().optional(),
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

export const localOrCloudProviderSchema = z.discriminatedUnion('type', [
  localProviderSchema,
  // AWS and GCP schemas used in favor of cloudProviderSchema as
  // discriminatedUnion methods cannot be nested
  awsCloudProviderSchema,
  gcpCloudProviderSchema,
]);

const validateMnemonic: SuperRefinement<string> = (mnemonic, ctx) => {
  const goWallet = goSync(() => ethers.Wallet.fromMnemonic(mnemonic));
  if (!goWallet.success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Airnode wallet mnemonic is not a valid mnemonic',
      path: [],
    });
  }
};

export const nodeSettingsSchema = z
  .object({
    airnodeWalletMnemonic: z.string().superRefine(validateMnemonic),
    heartbeat: heartbeatSchema,
    httpGateway: gatewaySchema,
    httpSignedDataGateway: gatewaySchema,
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

const ensureRelayedMetadataAreNotUsedWithGateways: SuperRefinement<{
  ois: OIS[];
  triggers: Triggers;
}> = (config, ctx) => {
  // Check whether we have `http` or `httpSignedData` trigger defined
  const httpGatewaysUsed = config.triggers.http.length !== 0;
  const httpSignedDataGatewaysUsed = config.triggers.httpSignedData.length !== 0;

  // If we don't use a gateway there's no need to check relayed metadata
  if (!httpGatewaysUsed && !httpSignedDataGatewaysUsed) return;

  forEach(config.ois, (ois) => {
    forEach(ois.apiSpecifications.security, (_emptyArray, securitySchemaName) => {
      const securitySchema = ois.apiSpecifications.components.securitySchemes[securitySchemaName];
      if (securitySchema && includes(RELAY_METADATA_TYPES, securitySchema.type)) {
        if (httpGatewaysUsed) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Relayed metadata authentication can't be used with an HTTP gateway`,
            path: ['ois', 'apiSpecifications', 'components', 'securitySchemes', securitySchemaName, 'type'],
          });
        }

        if (httpSignedDataGatewaysUsed) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Relayed metadata authentication can't be used with an HTTP signed data gateway`,
            path: ['ois', 'apiSpecifications', 'components', 'securitySchemes', securitySchemaName, 'type'],
          });
        }
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
  .superRefine(validateTriggersReferences)
  .superRefine(ensureRelayedMetadataAreNotUsedWithGateways);

export type Config = SchemaType<typeof configSchema>;
export type ApiCredentials = SchemaType<typeof apiCredentialsSchema>;
export type NodeSettings = SchemaType<typeof nodeSettingsSchema>;
export type Template = SchemaType<typeof templateSchema>;
export type CloudProvider = SchemaType<typeof cloudProviderSchema>;
export type LocalProvider = SchemaType<typeof localProviderSchema>;
export type AwsCloudProvider = SchemaType<typeof awsCloudProviderSchema>;
export type GcpCloudProvider = SchemaType<typeof gcpCloudProviderSchema>;
export type LocalOrCloudProvider = SchemaType<typeof localOrCloudProviderSchema>;
export type Providers = SchemaType<typeof providersSchema>;
export type Gateway = SchemaType<typeof gatewaySchema>;
export type ChainAuthorizers = SchemaType<typeof chainAuthorizersSchema>;
export type CrossChainAuthorizer = SchemaType<typeof crossChainRequesterAuthorizerSchema>;
export type ChainAuthorizations = SchemaType<typeof chainAuthorizationsSchema>;
export type ChainOptions = SchemaType<typeof chainOptionsSchema>;
export type ChainType = SchemaType<typeof chainTypeSchema>;
export type ChainConfig = SchemaType<typeof chainConfigSchema>;
export type LatestBlockPercentileGasPriceStrategy = z.infer<typeof latestBlockPercentileGasPriceStrategySchema>;
export type ProviderRecommendedGasPriceStrategy = z.infer<typeof providerRecommendedGasPriceStrategySchema>;
export type ProviderRecommendedEip1559GasPriceStrategy = z.infer<
  typeof providerRecommendedEip1559GasPriceStrategySchema
>;
export type ConstantGasPriceStrategy = z.infer<typeof constantGasPriceStrategySchema>;
export type GasPriceOracleStrategy = z.infer<typeof gasPriceOracleStrategySchema>;
export type GasPriceOracleConfig = z.infer<typeof gasPriceOracleSchema>;
export type Trigger = SchemaType<typeof triggerSchema>;
export type RrpTrigger = SchemaType<typeof rrpTriggerSchema>;
export type Triggers = SchemaType<typeof triggersSchema>;
export type Heartbeat = SchemaType<typeof heartbeatSchema>;
export type Amount = SchemaType<typeof amountSchema>;
export type EnabledGateway = SchemaType<typeof enabledGatewaySchema>;
export type MaxConcurrency = SchemaType<typeof maxConcurrencySchema>;
