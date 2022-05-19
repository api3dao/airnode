import { readFileSync } from 'fs';
import { join } from 'path';
import { ZodError } from 'zod';
import { chainOptionsSchema, configSchema, nodeSettingsSchema } from './config';
import { Config, SchemaType } from '../types';
import { version as packageVersion } from '../../package.json';

it('successfully parses config.json', () => {
  const config = JSON.parse(
    readFileSync(join(__dirname, '../../test/fixtures/interpolated-config.valid.json')).toString()
  );
  expect(() => configSchema.parse(config)).not.toThrow();
});

describe('chainOptionsSchema', () => {
  const eip1559ChainOptions: SchemaType<typeof chainOptionsSchema> = {
    txType: 'eip1559',
    baseFeeMultiplier: 2,
    priorityFee: {
      value: 3.12,
      unit: 'gwei',
    },
    fulfillmentGasLimit: 500000,
  };

  const legacyChainOptions: SchemaType<typeof chainOptionsSchema> = {
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
  const nodeSettings: SchemaType<typeof nodeSettingsSchema> = {
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

it('fails if ois.apiSpecifications.security.<securitySchemeName> is defined in ois.apiSpecifications.components.<securitySchemeName> but apiCredentials.securitySchemeValue is empty string', () => {
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
  const apiCredentials = [
    {
      oisTitle: 'Currency Converter API',
      securitySchemeName: 'Currency Converter Security Scheme',
      securitySchemeValue: '${SS_CURRENCY_CONVERTER_API_KEY}',
    },
  ];
  const configWithSecuritySchemes = {
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
    apiCredentials,
  };

  const invalidConfig = {
    ...configWithSecuritySchemes,
    apiCredentials: [
      ...config.apiCredentials,
      { ...apiCredentials[0], securitySchemeName: apiCredentials[0].securitySchemeName + Date.now().toString() },
    ],
  };
  expect(() => configSchema.parse(invalidConfig)).toThrow(
    new ZodError([
      {
        code: 'custom',
        message: 'The security scheme is enabled but no credentials are provided in "apiCredentials"',
        path: ['ois', 1, 'apiSpecifications', 'security', 'Currency Converter Security Scheme'],
      },
    ])
  );
});
