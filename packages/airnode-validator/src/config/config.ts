import { ethers } from 'ethers';
import { RefinementCtx, SuperRefinement, z } from 'zod';
import forEach from 'lodash/forEach';
import includes from 'lodash/includes';
import isEmpty from 'lodash/isEmpty';
import size from 'lodash/size';
import defaults from 'lodash/defaults';
import { goSync } from '@api3/promise-utils';
import { references } from '@api3/airnode-protocol';
import { version as packageVersion } from '../../package.json';
import { OIS, oisSchema, RELAY_METADATA_TYPES } from '../ois';
import { SchemaType } from '../types';

export const evmAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
export const evmIdSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/);
export const chainIdSchema = z.string().regex(/^\d+$/);

const AirnodeRrpV0Addresses: { [chainId: string]: string } = references.AirnodeRrpV0;
const AirnodeRrpV0DryRunAddresses: { [chainId: string]: string } = references.AirnodeRrpV0DryRun;
const RequesterAuthorizerWithErc721Addresses: { [chainId: string]: string } = references.RequesterAuthorizerWithErc721;

// We use a convention for deriving endpoint ID from OIS title and endpoint name,
// but we are not enforcing the convention in docs:
// https://docs.api3.org/reference/airnode/latest/concepts/endpoint.html#endpointid
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

export const airnodeRrpContractSchema = z
  .object({
    AirnodeRrp: evmAddressSchema.optional(),
    AirnodeRrpDryRun: evmAddressSchema.optional(),
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

export const sanitizedProviderRecommendedGasPriceStrategySchema = z
  .object({
    gasPriceStrategy: z.literal('sanitizedProviderRecommendedGasPrice'),
    recommendedGasPriceMultiplier: z.number().positive(),
    baseFeeMultiplierThreshold: z.number().positive(),
    baseFeeMultiplier: z.number().positive(),
    priorityFee: amountSchema,
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
  sanitizedProviderRecommendedGasPriceStrategySchema,
  providerRecommendedEip1559GasPriceStrategySchema,
  constantGasPriceStrategySchema,
]);

export const gasPriceOracleSchema = z
  .array(gasPriceOracleStrategySchema)
  .nonempty()
  .superRefine((strategies, ctx) => {
    const constantGasPriceStrategy = strategies.find((strategy) => strategy.gasPriceStrategy === 'constantGasPrice');

    if (!constantGasPriceStrategy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Missing required constantGasPrice strategy`,
        path: ['gasPriceOracle'],
      });
    }

    if (strategies[strategies.length - 1]?.gasPriceStrategy !== 'constantGasPrice') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `ConstantGasPrice strategy must be set as the last strategy in the array.`,
        path: ['gasPriceOracle'],
      });
    }
  });

export const chainOptionsSchema = z
  .object({
    fulfillmentGasLimit: z.number().int().optional(),
    withdrawalRemainder: amountSchema.optional(),
    gasPriceOracle: gasPriceOracleSchema,
  })
  .strict();

export const ensureValidAirnodeRrp = (airnodeRrp: string, chainId: string, ctx: RefinementCtx) => {
  if (!airnodeRrp) {
    if (!AirnodeRrpV0Addresses[chainId]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          `AirnodeRrp contract address must be specified for chain ID '${chainId}' ` +
          `as there was no deployment for this chain exported from @api3/airnode-protocol`,
        path: ['contracts'],
      });
      // This is a special symbol you can use to return early from the transform function.
      // It has type `never` so it does not affect the inferred return type.
      return z.NEVER;
    }
    // Default to the deployed AirnodeRrp contract address if contracts is not specified
    return AirnodeRrpV0Addresses[chainId];
  }
  return airnodeRrp;
};

export const ensureValidAirnodeRrpDryRun = (
  airnodeRrpDryRun: string | undefined,
  chainId: string,
  ctx: RefinementCtx,
  options: SchemaType<typeof chainOptionsSchema>
) => {
  // If 'fulfillmentGasLimit' is defined in the config,
  // it indicates that the AirnodeRrpDryRun contract will not be used to estimate gas
  if (options?.fulfillmentGasLimit) {
    return airnodeRrpDryRun;
  }

  if (!airnodeRrpDryRun) {
    if (!AirnodeRrpV0DryRunAddresses[chainId]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          `When 'fulfillmentGasLimit' is not specified, ` +
          `AirnodeRrpDryRun contract address must be specified for chain ID '${chainId}' ` +
          `as there was no deployment for this chain exported from @api3/airnode-protocol`,
        path: ['contracts'],
      });
      // This is a special symbol you can use to return early from the transform function.
      // It has type `never` so it does not affect the inferred return type.
      return z.NEVER;
    }
    // Default to the deployed AirnodeRrpDryRun contract address if contracts is not specified
    return AirnodeRrpV0DryRunAddresses[chainId];
  }
  return airnodeRrpDryRun;
};

export const ensureConfigValidAirnodeRrp = (value: z.infer<typeof _chainConfigSchema>, ctx: RefinementCtx) => {
  const contracts = defaults(value.contracts, { AirnodeRrp: '' });

  const AirnodeRrp = ensureValidAirnodeRrp(contracts.AirnodeRrp, value.id, ctx);
  const AirnodeRrpDryRun = ensureValidAirnodeRrpDryRun(contracts.AirnodeRrpDryRun, value.id, ctx, value.options);
  // This transformation ensures that the output type of `chains.contracts` is { AirnodeRrp: string, AirnodeRrpDryRun: string | undefined }
  return { ...value, contracts: { ...value.contracts, AirnodeRrp, AirnodeRrpDryRun } };
};

// Similar to ensureConfigValidAirnodeRrp, but this needs to be a separate function because of the distinct
// inferred type parameter (zod runs into cyclic inference errors with a single function that accepts either type)
export const ensureCrossChainRequesterAuthorizerValidAirnodeRrp = (
  value: z.infer<typeof _crossChainRequesterAuthorizerSchema>,
  ctx: RefinementCtx
) => {
  const contracts = defaults(value.contracts, { AirnodeRrp: '' });

  const AirnodeRrp = ensureValidAirnodeRrp(contracts.AirnodeRrp, value.chainId, ctx);
  // This transformation ensures that the output type of `crossChainRequesterAuthorizer.contracts` is { AirnodeRrp: string, AirnodeRrpDryRun: string | undefined }
  return { ...value, contracts: { ...value.contracts, AirnodeRrp } };
};

export const chainAuthorizationsSchema = z.object({
  requesterEndpointAuthorizations: z.record(endpointIdSchema, z.array(evmAddressSchema)),
});

export const requesterEndpointAuthorizersSchema = z.array(evmAddressSchema);

const _crossChainRequesterAuthorizerSchema = z
  .object({
    requesterEndpointAuthorizers: requesterEndpointAuthorizersSchema.nonempty(),
    chainType: chainTypeSchema,
    chainId: chainIdSchema,
    // The type system requires optional() be transformed to the expected type here despite the later transform
    contracts: airnodeRrpContractSchema.optional().transform((val) => defaults(val, { AirnodeRrp: '' })),
    chainProvider: providerSchema,
  })
  .strict();

export const crossChainRequesterAuthorizerSchema = _crossChainRequesterAuthorizerSchema.transform(
  ensureCrossChainRequesterAuthorizerValidAirnodeRrp
);

export const erc721sSchema = z.array(evmAddressSchema);

export const requesterAuthorizerWithErc721Schema = z.object({
  erc721s: erc721sSchema.nonempty(),
  // The type system requires optional() be transformed to the expected type here despite the later transform
  RequesterAuthorizerWithErc721: evmAddressSchema.optional().transform((val) => (val === undefined ? '' : val)),
});

export const requesterAuthorizersWithErc721Schema = z.array(requesterAuthorizerWithErc721Schema);

export const requesterAuthorizerWithErc721ContractSchema = z
  .object({
    RequesterAuthorizerWithErc721: evmAddressSchema,
  })
  .strict();

// This transform operates on entire chain config object because this is where the chain id is defined,
// and the chain id is necessary to look up the RequesterAuthorizerWithErc721 contract address
export const ensureRequesterAuthorizerWithErc721 = (value: z.infer<typeof _chainConfigSchema>, ctx: RefinementCtx) => {
  if (!isEmpty(value.authorizers.requesterAuthorizersWithErc721)) {
    const arr = value.authorizers.requesterAuthorizersWithErc721.map((raObj, ind) => {
      if (!raObj.RequesterAuthorizerWithErc721) {
        if (!RequesterAuthorizerWithErc721Addresses[value.id]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              `RequesterAuthorizerWithErc721 contract address must be specified for chain ID '${value.id}' ` +
              `as there was no deployment for this chain exported from @api3/airnode-protocol`,
            path: ['authorizers', 'requesterAuthorizersWithErc721', ind],
          });
          return z.NEVER; // We need to return early from the transform while preserving the return type
        }
        // Default to the deployed RequesterAuthorizerWithErc721 contract address for the chain
        return { ...raObj, RequesterAuthorizerWithErc721: RequesterAuthorizerWithErc721Addresses[value.id] };
      }
      return raObj;
    });
    return { ...value, authorizers: { ...value.authorizers, requesterAuthorizersWithErc721: arr } };
  }
  return value;
};

export const ensureCrossChainRequesterAuthorizerWithErc721 = (
  value: z.infer<typeof _crossChainRequesterAuthorizersWithErc721Schema>,
  ctx: RefinementCtx
) => {
  if (!value.contracts?.RequesterAuthorizerWithErc721) {
    if (!RequesterAuthorizerWithErc721Addresses[value.chainId]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          `RequesterAuthorizerWithErc721 contract address must be specified for chain ID '${value.chainId}' ` +
          `as there was no deployment for this chain exported from @api3/airnode-protocol`,
        path: ['contracts'],
      });
      return value;
    }
    // Default to the deployed RequesterAuthorizerWithErc721 contract address for the chain
    return {
      ...value,
      contracts: { RequesterAuthorizerWithErc721: RequesterAuthorizerWithErc721Addresses[value.chainId] },
    };
  }
  return value;
};

const _crossChainRequesterAuthorizersWithErc721Schema = z.object({
  erc721s: erc721sSchema.nonempty(),
  chainType: chainTypeSchema,
  chainId: chainIdSchema,
  // The type system requires optional() be transformed to the expected type here despite the later transform
  contracts: requesterAuthorizerWithErc721ContractSchema
    .optional()
    .transform((val) => defaults(val, { RequesterAuthorizerWithErc721: '' })),
  chainProvider: providerSchema,
});

export const crossChainRequesterAuthorizersWithErc721Schema = _crossChainRequesterAuthorizersWithErc721Schema.transform(
  ensureCrossChainRequesterAuthorizerWithErc721
);

export const chainAuthorizersSchema = z.object({
  requesterEndpointAuthorizers: requesterEndpointAuthorizersSchema,
  crossChainRequesterAuthorizers: z.array(crossChainRequesterAuthorizerSchema),
  requesterAuthorizersWithErc721: requesterAuthorizersWithErc721Schema,
  crossChainRequesterAuthorizersWithErc721: z.array(crossChainRequesterAuthorizersWithErc721Schema),
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

const _chainConfigSchema = z
  .object({
    authorizers: chainAuthorizersSchema,
    authorizations: chainAuthorizationsSchema,
    blockHistoryLimit: z.number().int().optional(), // Defaults to BLOCK_COUNT_HISTORY_LIMIT defined in airnode-node
    // The type system requires optional() be transformed to the expected type here despite the later transform
    contracts: airnodeRrpContractSchema.optional().transform((val) => defaults(val, { AirnodeRrp: '' })),
    id: chainIdSchema,
    // Defaults to BLOCK_MIN_CONFIRMATIONS defined in airnode-node but may be overridden
    // by a requester if the _minConfirmations reserved parameter is configured
    minConfirmations: z.number().int().optional(),
    type: chainTypeSchema,
    options: chainOptionsSchema,
    providers: providersSchema,
    maxConcurrency: maxConcurrencySchema,
  })
  .strict();

export const chainConfigSchema = _chainConfigSchema
  .transform(ensureConfigValidAirnodeRrp)
  .transform(ensureRequesterAuthorizerWithErc721)
  .superRefine(validateMaxConcurrency);

export const apiKeySchema = z.string().min(30).max(120);

export const corsOriginsSchema = z.array(z.string());

export const enabledGatewaySchema = z
  .object({
    enabled: z.literal(true),
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
    oevGateway: gatewaySchema,
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
  .strict();

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

        return;
      }

      // Check that the hash of the oisTitle and endpointName matches the trigger's endpointId
      const derivedEndpointId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(['string', 'string'], [oisTitle, endpointName])
      );
      if (derivedEndpointId !== trigger.endpointId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `The endpointId does not match the hash of the oisTitle and endpointName`,
          path: ['triggers', triggerSection, index, 'endpointId'],
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
export type RequesterEndpointAuthorizers = SchemaType<typeof requesterEndpointAuthorizersSchema>;
export type Erc721s = SchemaType<typeof erc721sSchema>;
export type ChainAuthorizations = SchemaType<typeof chainAuthorizationsSchema>;
export type ChainOptions = SchemaType<typeof chainOptionsSchema>;
export type ChainType = SchemaType<typeof chainTypeSchema>;
export type ChainId = SchemaType<typeof chainIdSchema>;
export type ChainConfig = SchemaType<typeof chainConfigSchema>;
export type LatestBlockPercentileGasPriceStrategy = z.infer<typeof latestBlockPercentileGasPriceStrategySchema>;
export type ProviderRecommendedGasPriceStrategy = z.infer<typeof providerRecommendedGasPriceStrategySchema>;
export type SanitizedProviderRecommendedGasPriceStrategy = z.infer<
  typeof sanitizedProviderRecommendedGasPriceStrategySchema
>;
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

export const availableCloudProviders = Array.from(cloudProviderSchema.optionsMap.keys()) as CloudProvider['type'][];
