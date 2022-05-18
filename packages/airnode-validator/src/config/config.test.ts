import { readFileSync } from 'fs';
import { join } from 'path';
import { ZodError } from 'zod';
import { configSchema, nodeSettingsSchema, templatesSchema } from './config';
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

describe('templates', () => {
  it('does not allow invalid templates', () => {
    const invalidTemplates = {
      // invalid templateId
      '0x38ba0e80224f14d0c654c4ba6e3745fcb7f310fd4f2f80994fe802da013edaff': {
        airnodeAddress: '0xD5659F26A72A8D718d1955C42B3AE418edB001e0',
        endpointId: '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6',
        encodedParameters: '0x6874656d706c6174656576616c7565',
      },
    };

    expect(() => templatesSchema.parse(invalidTemplates)).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: `Template ID "0x38ba0e80224f14d0c654c4ba6e3745fcb7f310fd4f2f80994fe802da013edaff" is invalid`,
          path: ['0x38ba0e80224f14d0c654c4ba6e3745fcb7f310fd4f2f80994fe802da013edaff'],
        },
      ])
    );
  });
});
