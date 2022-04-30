import { readFileSync } from 'fs';
import { join } from 'path';
import { ZodError } from 'zod';
import { configSchema, nodeSettingsSchema } from './config';
import { version as packageVersion } from '../../package.json';

it('successfully parses config.json specs', () => {
  const ois = JSON.parse(readFileSync(join(__dirname, '../../exampleSpecs/interpolated-config.specs.json')).toString());
  expect(() => configSchema.parse(ois)).not.toThrow();
});

describe('nodeSettingsSchema', () => {
  const nodeSettings = {
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
    skipValidation: true,
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
});
