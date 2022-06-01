import { readFileSync } from 'fs';
import { join } from 'path';
import { ZodError } from 'zod';
import { Config, chainOptionsSchema, configSchema, nodeSettingsSchema, ChainOptions, NodeSettings } from './config';
import { version as packageVersion } from '../../package.json';

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

describe('chainOptionsSchema', () => {
  const eip1559ChainOptions: ChainOptions = {
    txType: 'eip1559',
    baseFeeMultiplier: 2,
    priorityFee: {
      value: 3.12,
      unit: 'gwei',
    },
    fulfillmentGasLimit: 500000,
  };

  const legacyChainOptions: ChainOptions = {
    txType: 'legacy',
    gasPriceMultiplier: 1.1,
    fulfillmentGasLimit: 500000,
  };

  it('does not allow legacy chain options for eip1559 transactions', () => {
    expect(() => chainOptionsSchema.parse(eip1559ChainOptions)).not.toThrow();

    const invalidEip1559Settings = { ...eip1559ChainOptions, gasPriceMultiplier: 2 };
    expect(() => chainOptionsSchema.parse(invalidEip1559Settings)).toThrow(
      new ZodError([
        {
          code: 'unrecognized_keys',
          keys: ['gasPriceMultiplier'],
          path: [],
          message: `Unrecognized or disallowed key(s) for the given transaction type: 'gasPriceMultiplier'`,
        },
      ])
    );
  });

  it('does not allow eip1559 chain options for legacy transactions', () => {
    expect(() => chainOptionsSchema.parse(legacyChainOptions)).not.toThrow();

    const invalidLegacySettings = { ...legacyChainOptions, baseFeeMultiplier: 2, priorityFee: 3.12 };
    expect(() => chainOptionsSchema.parse(invalidLegacySettings)).toThrow(
      new ZodError([
        {
          code: 'unrecognized_keys',
          keys: ['baseFeeMultiplier', 'priorityFee'],
          path: [],
          message: `Unrecognized or disallowed key(s) for the given transaction type: 'baseFeeMultiplier', 'priorityFee'`,
        },
      ])
    );
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
