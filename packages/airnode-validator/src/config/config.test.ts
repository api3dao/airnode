import { readFileSync } from 'fs';
import { join } from 'path';
import { ZodError } from 'zod';
import zip from 'lodash/zip';
import {
  Config,
  configSchema,
  nodeSettingsSchema,
  NodeSettings,
  amountSchema,
  Amount,
  enabledHeartbeatSchema,
  gatewaySchema,
  heartbeatSchema,
  gasPriceOracleSchema,
  EnabledGateway,
  localOrCloudProviderSchema,
  chainConfigSchema,
} from './config';
import { version as packageVersion } from '../../package.json';
import { SchemaType } from '../types';

it('successfully parses config.json', () => {
  const config = JSON.parse(
    readFileSync(join(__dirname, '../../test/fixtures/interpolated-config.valid.json')).toString()
  );
  expect(() => configSchema.parse(config)).not.toThrow();
});

it(`doesn't allow extraneous properties`, () => {
  const config = JSON.parse(
    readFileSync(join(__dirname, '../../test/fixtures/interpolated-config.valid.json')).toString()
  );
  expect(() => configSchema.parse(config)).not.toThrow();

  const invalidConfig = { ...config, unknownProp: 'someValue' };
  expect(() => configSchema.parse(invalidConfig)).toThrow(
    new ZodError([
      {
        code: 'unrecognized_keys',
        keys: ['unknownProp'],
        path: [],
        message: `Unrecognized key(s) in object: 'unknownProp'`,
      },
    ])
  );
});

describe('gasPriceOracleSchema', () => {
  const latestBlockPercentileGasPriceStrategy = {
    gasPriceStrategy: 'latestBlockPercentileGasPrice',
    percentile: 60,
    minTransactionCount: 10,
    pastToCompareInBlocks: 20,
    maxDeviationMultiplier: 2,
  };
  const providerRecommendedGasPriceStrategy = {
    gasPriceStrategy: 'providerRecommendedGasPrice',
    recommendedGasPriceMultiplier: 1.2,
  };
  const providerRecommendedEip1559GasPriceStrategy = {
    gasPriceStrategy: 'providerRecommendedEip1559GasPrice',
    baseFeeMultiplier: 2,
    priorityFee: {
      value: 3.12,
      unit: 'gwei',
    },
  };
  const constantGasPriceStrategy = {
    gasPriceStrategy: 'constantGasPrice',
    gasPrice: {
      value: 10,
      unit: 'gwei',
    },
  };
  const gasPriceOracleOptions = [
    latestBlockPercentileGasPriceStrategy,
    providerRecommendedGasPriceStrategy,
    providerRecommendedEip1559GasPriceStrategy,
    constantGasPriceStrategy,
  ];

  gasPriceOracleOptions.forEach((gasPriceOracleOption) =>
    it('allows valid gas price oracle strategy', () => {
      expect(() => gasPriceOracleSchema.parse([gasPriceOracleOption, constantGasPriceStrategy])).not.toThrow();
    })
  );

  it('allows all valid gas price oracle strategies', () => {
    expect(() => gasPriceOracleSchema.parse(gasPriceOracleOptions)).not.toThrow();
  });

  it('throws on empty price oracle strategies', () => {
    expect(() => gasPriceOracleSchema.parse([])).toThrow(
      new ZodError([
        {
          code: 'too_small',
          minimum: 1,
          type: 'array',
          inclusive: true,
          message: 'Array must contain at least 1 element(s)',
          path: [],
        },
        {
          code: 'custom',
          message: 'Missing required constantGasPrice strategy',
          path: ['gasPriceOracle'],
        },
        {
          code: 'custom',
          message: 'ConstantGasPrice strategy must be set as the last strategy in the array.',
          path: ['gasPriceOracle'],
        },
      ])
    );
  });

  it('throws if constantGasPrice is not the last strategy in the array', () => {
    expect(() =>
      gasPriceOracleSchema.parse([
        latestBlockPercentileGasPriceStrategy,
        constantGasPriceStrategy,
        providerRecommendedGasPriceStrategy,
      ])
    ).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: 'ConstantGasPrice strategy must be set as the last strategy in the array.',
          path: ['gasPriceOracle'],
        },
      ])
    );
  });

  // Test invalid strategies containing only the gasPriceStrategy field
  gasPriceOracleOptions
    .map((oracleStrategy) => oracleStrategy.gasPriceStrategy)
    .forEach((oracleStrategy) =>
      it('throws on invalid gas price oracle', () => {
        expect(() => gasPriceOracleSchema.parse([oracleStrategy, constantGasPriceStrategy])).toThrow();
      })
    );
});

describe('amountSchema', () => {
  const amount: Amount = {
    value: 2 ** 52,
    unit: 'wei',
  };

  it('does not allow numbers greater than (2**53 - 1) i.e. those accurately represented as integers', () => {
    expect(() => amountSchema.parse(amount)).not.toThrow();

    // 1 ETH in wei
    const invalidAmount = { ...amount, value: 1_000_000_000_000_000_000 };
    expect(() => amountSchema.parse(invalidAmount)).toThrow();

    const otherInvalidAmount = { ...amount, value: 2 ** 53 };
    expect(() => amountSchema.parse(otherInvalidAmount)).toThrow();
  });
});

describe('nodeSettingsSchema', () => {
  const nodeSettings: NodeSettings = {
    cloudProvider: {
      type: 'local',
    },
    airnodeWalletMnemonic: 'test test test test test test test test test test test junk',
    heartbeat: {
      enabled: false,
    },
    httpGateway: {
      enabled: false,
    },
    httpSignedDataGateway: {
      enabled: false,
    },
    logFormat: 'plain',
    logLevel: 'INFO',
    nodeVersion: packageVersion,
    stage: 'dev',
  };

  it('must match package version', () => {
    expect(() => nodeSettingsSchema.parse(nodeSettings)).not.toThrow();

    const invalidNodeSettings = { ...nodeSettings, nodeVersion: '0.4.0' };
    expect(() => nodeSettingsSchema.parse(invalidNodeSettings)).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: `The "nodeVersion" must be ${packageVersion}`,
          path: ['nodeVersion'],
        },
      ])
    );
  });

  it('does not allow same gateway keys on AWS', () => {
    const invalidNodeSettings = {
      ...nodeSettings,
      cloudProvider: {
        type: 'aws',
        region: 'region',
        disableConcurrencyReservations: false,
      },
      httpGateway: {
        enabled: true,
        apiKey: 'e83856ed-36cd-4b5f-a559-c8291e96e17e',
        maxConcurrency: 10,
        corsOrigins: [],
      },
      httpSignedDataGateway: {
        enabled: true,
        apiKey: 'e83856ed-36cd-4b5f-a559-c8291e96e17e',
        maxConcurrency: 10,
        corsOrigins: [],
      },
    };

    expect(() => nodeSettingsSchema.parse(invalidNodeSettings)).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: `Using the same gateway keys is not allowed on AWS`,
          path: [],
        },
      ])
    );
  });

  it('is ok if both gateways are disabled on AWS', () => {
    const validNodeSettings = {
      ...nodeSettings,
      cloudProvider: {
        type: 'aws',
        region: 'region',
        disableConcurrencyReservations: false,
      },
    };

    expect(() => nodeSettingsSchema.parse(validNodeSettings)).not.toThrow();
  });

  it('returns a sensible error with a malformed cloudProvider object', () => {
    const invalidCloudProvider = {
      // missing projectId
      type: 'gcp',
      region: 'us-east1',
      disableConcurrencyReservations: false,
    };
    expect(() => localOrCloudProviderSchema.parse(invalidCloudProvider)).toThrow(
      new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'undefined',
          path: ['projectId'],
          message: `Required`,
        },
      ])
    );
  });

  it('does not allow invalid mnemonic', () => {
    const invalidMnemonicNodeSettings = {
      ...nodeSettings,
      airnodeWalletMnemonic: 'invalid mnemonic',
    };
    expect(() => nodeSettingsSchema.parse(invalidMnemonicNodeSettings)).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: 'Airnode wallet mnemonic is not a valid mnemonic',
          path: ['airnodeWalletMnemonic'],
        },
      ])
    );
  });
});

describe('templates', () => {
  it('does not allow invalid templates', () => {
    const config = JSON.parse(
      readFileSync(join(__dirname, '../../test/fixtures/interpolated-config.valid.json')).toString()
    );
    const invalidTemplates = [
      {
        // invalid templateId
        templateId: '0x38ba0e80224f14d0c654c4ba6e3745fcb7f310fd4f2f80994fe802da013edaff',
        endpointId: '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6',
        encodedParameters: '0x6874656d706c6174656576616c7565',
      },
    ];

    expect(() => configSchema.parse({ ...config, templates: invalidTemplates })).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: `Template is invalid`,
          path: ['0x38ba0e80224f14d0c654c4ba6e3745fcb7f310fd4f2f80994fe802da013edaff'],
        },
      ])
    );
  });
});

it('fails if a securitySchemeName is enabled and it is of type "apiKey" or "http" but is missing credentials in "apiCredentials"', () => {
  const config: Config = JSON.parse(
    readFileSync(join(__dirname, '../../test/fixtures/interpolated-config.valid.json')).toString()
  );

  const securitySchemeName = 'Currency Converter Security Scheme';
  const securityScheme = {
    [securitySchemeName]: {
      in: 'query',
      type: 'apiKey',
      name: 'access_key',
    },
  };
  const invalidConfig = {
    ...config,
    ois: [
      ...config.ois,
      {
        ...config.ois[0],
        apiSpecifications: {
          ...config.ois[0].apiSpecifications,
          components: { securitySchemes: securityScheme },
          security: { [securitySchemeName]: [] },
        },
      },
    ],
    apiCredentials: [],
  };

  expect(() => configSchema.parse(invalidConfig)).toThrow(
    new ZodError([
      {
        code: 'custom',
        message: 'The security scheme is enabled but no credentials are provided in "apiCredentials"',
        path: ['ois', 1, 'apiSpecifications', 'security', securitySchemeName],
      },
    ])
  );
});

describe('triggers references', () => {
  const config: Config = JSON.parse(
    readFileSync(join(__dirname, '../../test/fixtures/interpolated-config.valid.json')).toString()
  );

  it(`fails if an OIS referenced in a trigger doesn't exist`, () => {
    const invalidConfig = {
      ...config,
      triggers: {
        ...config.triggers,
        rrp: [{ ...config.triggers.rrp[0], oisTitle: 'nonExistingOis' }],
      },
    };

    expect(() => configSchema.parse(invalidConfig)).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: `No matching OIS for trigger with OIS title "nonExistingOis"`,
          path: ['triggers', 'rrp', 0, 'oisTitle'],
        },
      ])
    );
  });

  it(`fails if an endpoint referenced in a trigger doesn't exist`, () => {
    const invalidConfig = {
      ...config,
      triggers: {
        ...config.triggers,
        rrp: [{ ...config.triggers.rrp[0], endpointName: 'nonExistingEndpointName' }],
      },
    };

    expect(() => configSchema.parse(invalidConfig)).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: `No matching endpoint for trigger with endpoint name "nonExistingEndpointName"`,
          path: ['triggers', 'rrp', 0, 'endpointName'],
        },
      ])
    );
  });
});

describe('apiKey schemas', () => {
  const gateway: EnabledGateway = {
    enabled: true,
    apiKey: 'e83856ed-36cd-4b5f-a559-c8291e96e17e',
    maxConcurrency: 100,
    corsOrigins: [],
  };
  const heartbeat: SchemaType<typeof enabledHeartbeatSchema> = {
    enabled: true,
    apiKey: 'e83856ed-36cd-4b5f-a559-c8291e96e17e',
    id: 'some-id',
    url: 'https://www.uuidgenerator.net/version4',
  };

  zip([gateway, heartbeat], [gatewaySchema, heartbeatSchema]).forEach(([_value, _schema]) => {
    const value = _value!;
    const schema = _schema!;

    it('verifies edge cases', () => {
      let newValue: any;

      newValue = { ...value, apiKey: 'x'.repeat(29) };
      expect(() => schema.parse(newValue)).toThrow(
        new ZodError([
          {
            code: 'too_small',
            minimum: 30,
            type: 'string',
            inclusive: true,
            message: 'String must contain at least 30 character(s)',
            path: ['apiKey'],
          },
        ])
      );

      newValue = { ...value, apiKey: 'x'.repeat(121) };
      expect(() => schema.parse(newValue)).toThrow(
        new ZodError([
          {
            code: 'too_big',
            maximum: 120,
            type: 'string',
            inclusive: true,
            message: 'String must contain at most 120 character(s)',
            path: ['apiKey'],
          },
        ])
      );

      newValue = { ...value, apiKey: 'x'.repeat(30) };
      expect(() => schema.parse(newValue)).not.toThrow();

      newValue = { ...value, apiKey: 'x'.repeat(120) };
      expect(() => schema.parse(newValue)).not.toThrow();
    });

    it('works with uuids and standard length keys', () => {
      expect(() => schema.parse(value)).not.toThrow();
    });
  });
});

describe('relay metadata', () => {
  const config: Config = JSON.parse(
    readFileSync(join(__dirname, '../../test/fixtures/interpolated-config.valid.json')).toString()
  );

  const configWithRelayedMetadataSecurityScheme = {
    ...config,
    ois: [
      {
        ...config.ois[0],
        apiSpecifications: {
          ...config.ois[0].apiSpecifications,
          components: {
            securitySchemes: {
              relayChainId: {
                in: 'query',
                type: 'relayChainId',
                name: 'chainId',
              },
            },
          },
          security: {
            relayChainId: [],
          },
        },
      },
    ],
  };

  // exclude cacheResponses specific to rrp
  const { endpointId, endpointName, oisTitle } = configWithRelayedMetadataSecurityScheme.triggers.rrp[0];
  const trigger = { endpointId, endpointName, oisTitle };

  it(`is ok if there are relay metadata security schemes but there are no gateways`, () => {
    expect(() => configSchema.parse(configWithRelayedMetadataSecurityScheme)).not.toThrow();
  });

  it(`is ok if there are gateways but there are no relay metadata security schemes`, () => {
    const validConfig = {
      ...config,
      triggers: {
        ...config.triggers,
        http: [trigger],
      },
    };

    expect(() => configSchema.parse(validConfig)).not.toThrow();
  });

  it(`fails if there are relay metadata security schemes and HTTP gateway`, () => {
    const invalidConfig = {
      ...configWithRelayedMetadataSecurityScheme,
      triggers: {
        ...configWithRelayedMetadataSecurityScheme.triggers,
        http: [trigger],
      },
    };

    expect(() => configSchema.parse(invalidConfig)).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: `Relayed metadata authentication can't be used with an HTTP gateway`,
          path: ['ois', 'apiSpecifications', 'components', 'securitySchemes', 'relayChainId', 'type'],
        },
      ])
    );
  });

  it(`fails if there are relay metadata security schemes and HTTP signed data gateway`, () => {
    const invalidConfig = {
      ...configWithRelayedMetadataSecurityScheme,
      triggers: {
        ...configWithRelayedMetadataSecurityScheme.triggers,
        httpSignedData: [trigger],
      },
    };

    expect(() => configSchema.parse(invalidConfig)).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: `Relayed metadata authentication can't be used with an HTTP signed data gateway`,
          path: ['ois', 'apiSpecifications', 'components', 'securitySchemes', 'relayChainId', 'type'],
        },
      ])
    );
  });

  it(`fails if there are relay metadata security schemes and both gateways`, () => {
    const invalidConfig = {
      ...configWithRelayedMetadataSecurityScheme,
      triggers: {
        ...configWithRelayedMetadataSecurityScheme.triggers,
        http: [trigger],
        httpSignedData: [trigger],
      },
    };

    expect(() => configSchema.parse(invalidConfig)).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: `Relayed metadata authentication can't be used with an HTTP gateway`,
          path: ['ois', 'apiSpecifications', 'components', 'securitySchemes', 'relayChainId', 'type'],
        },
        {
          code: 'custom',
          message: `Relayed metadata authentication can't be used with an HTTP signed data gateway`,
          path: ['ois', 'apiSpecifications', 'components', 'securitySchemes', 'relayChainId', 'type'],
        },
      ])
    );
  });
});

describe('authorizations', () => {
  it('is ok if authorizations are in correct format', () => {
    const config = JSON.parse(
      readFileSync(join(__dirname, '../../test/fixtures/interpolated-config.valid.json')).toString()
    );

    const validConfig = {
      ...config,
      chains: [
        {
          ...config.chains[0],
          authorizations: {
            requesterEndpointAuthorizations: {
              '0xfb87102cdabadf905321521ba0b3cbf74ad09c5d400ac2eccdbef8d6143e78c4': [
                '0x5FbDB2315678afecb367f032d93F642f64180aa3',
              ],
            },
          },
        },
      ],
    };

    expect(() => configSchema.parse(validConfig)).not.toThrow();
  });

  it('fails if authorizations are in wrong format', () => {
    const config = JSON.parse(
      readFileSync(join(__dirname, '../../test/fixtures/interpolated-config.valid.json')).toString()
    );

    const invalidConfig = {
      ...config,
      chains: [
        {
          ...config.chains[0],
          authorizations: {
            requesterEndpointAuthorizations: {
              'endpoint-id': ['requester-1'],
            },
          },
        },
      ],
    };

    expect(() => configSchema.parse(invalidConfig)).toThrow(
      new ZodError([
        {
          validation: 'regex',
          code: 'invalid_string',
          message: 'Invalid',
          path: ['chains', 0, 'authorizations', 'requesterEndpointAuthorizations', 'endpoint-id', 0],
        },
      ])
    );
  });
});

describe('chainConfigSchema', () => {
  it('validates maximum concurrency limit', () => {
    const config = JSON.parse(readFileSync(join(__dirname, '../../test/fixtures/config.valid.json')).toString());

    const invalidConcurrencyChainConfig = {
      ...config.chains[0],
      maxConcurrency: 2,
      providers: {
        provider1: {
          url: 'http://some.random.url',
        },
        provider2: {
          url: 'http://some.random.url',
        },
        provider3: {
          url: 'http://some.random.url',
        },
      },
    };
    expect(() => chainConfigSchema.parse(invalidConcurrencyChainConfig)).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: `Concurrency limit can't be lower than the number of providers for given chain`,
          path: ['maxConcurrency'],
        },
      ])
    );
  });
});

describe('authorizers', () => {
  it('allows cross-chain and same-chain authorizers', () => {
    const config = JSON.parse(
      readFileSync(join(__dirname, '../../test/fixtures/interpolated-config.valid.json')).toString()
    );
    const validAuthorizersChainConfig = {
      ...config.chains[0],
      authorizers: {
        requesterEndpointAuthorizers: ['0x1FbDB2315678afecb367f032d93F642f64180aa4'],
        crossChainRequesterAuthorizers: [
          {
            requesterEndpointAuthorizers: ['0x2FbDB2315678afecb367f032d93F642f64180aa5'],
            chainType: 'evm',
            chainId: '1',
            chainProvider: {
              url: 'http://some.random.url',
            },
            contracts: {
              AirnodeRrp: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
            },
          },
        ],
      },
    };
    expect(() => chainConfigSchema.parse(validAuthorizersChainConfig)).not.toThrow();
  });

  it('allows cross-chain and same-chain authorizers to be empty', () => {
    const config = JSON.parse(
      readFileSync(join(__dirname, '../../test/fixtures/interpolated-config.valid.json')).toString()
    );
    const validAuthorizersChainConfig = {
      ...config.chains[0],
      authorizers: {
        requesterEndpointAuthorizers: [],
        crossChainRequesterAuthorizers: [],
      },
    };
    expect(() => chainConfigSchema.parse(validAuthorizersChainConfig)).not.toThrow();
  });
});
