import { readFileSync } from 'fs';
import { join } from 'path';
import { ZodError } from 'zod';
import { configSchema, nodeSettingsSchema } from './config';
import { version as packageVersion } from '../../package.json';
import { SchemaType } from '../types';

it('successfully parses config.json', () => {
  const ois = JSON.parse(
    readFileSync(join(__dirname, '../../test/fixtures/interpolated-config.valid.json')).toString()
  );
  expect(() => configSchema.parse(ois)).not.toThrow();
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
