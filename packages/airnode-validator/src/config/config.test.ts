import { readFileSync } from 'fs';
import { join } from 'path';
import { ZodError } from 'zod';
import { chainOptionsSchema, configSchema, nodeSettingsSchema } from './config';
import { version as packageVersion } from '../../package.json';
import { SchemaType } from '../types';

it('successfully parses config.json', () => {
  const ois = JSON.parse(
    readFileSync(join(__dirname, '../../test/fixtures/interpolated-config.valid.json')).toString()
  );
  expect(() => configSchema.parse(ois)).not.toThrow();
});

describe('chainOptionsSchema', () => {
  const chainOptions: SchemaType<typeof chainOptionsSchema> = {
    txType: 'eip1559',
    baseFeeMultiplier: 2,
    priorityFee: {
      value: 3.12,
      unit: 'gwei',
    },
    fulfillmentGasLimit: 500000,
  };

  it('does not allow legacy chain options for eip1559 transactions', () => {
    expect(() => chainOptionsSchema.parse(chainOptions)).not.toThrow();

    const invalidEip1559Settings = { ...chainOptions, gasPriceMultiplier: 2 };
    expect(() => chainOptionsSchema.parse(invalidEip1559Settings)).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: `gasPriceMultiplier can only be used for legacy transactions`,
          path: [],
        },
      ])
    );
  });

  it('does not allow eip1559 chain options for legacy transactions', () => {
    const invalidLegacySettings = { ...chainOptions, txType: 'legacy' };
    expect(() => chainOptionsSchema.parse(invalidLegacySettings)).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: `baseFeeMultiplier and priorityFee can only be used for eip1559 transactions`,
          path: [],
        },
      ])
    );

    const validLegacySettings = { ...invalidLegacySettings, baseFeeMultiplier: undefined, priorityFee: undefined };
    expect(() => chainOptionsSchema.parse(validLegacySettings)).not.toThrow();
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
