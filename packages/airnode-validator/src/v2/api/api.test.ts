import { join } from 'path';
import { readFileSync } from 'fs';
import forEach from 'lodash/forEach';
import { parseConfigWithSecrets, unsafeParseConfigWithSecrets } from './api';
import { configSchema } from '../config';
import { SchemaType } from '../types';
import { ValidatorError } from '..';

const loadConfigFixture = (): SchemaType<typeof configSchema> =>
  // We type the result as "Config", however it will not pass validation in it's current state because the secrets are
  // not interpolated
  JSON.parse(readFileSync(join(__dirname, '../../../exampleSpecs/config.specs.json')).toString());

const interpolateSecrets = (config: unknown, secrets: Record<string, string>) => {
  let strConfig = JSON.stringify(config);

  forEach(secrets, (val, key) => {
    strConfig = strConfig.replace('${' + key + '}', val);
  });

  return JSON.parse(strConfig);
};

describe('parseConfigWithSecrets', () => {
  it('interpolates secrets and accepts valid config', () => {
    const config = loadConfigFixture();
    const secrets = {
      PROVIDER_URL: 'http://127.0.0.1:8545/',
      AIRNODE_WALLET_MNEMONIC: 'test test test test test test test test test test test junk',
    };

    const interpolatedResult = interpolateSecrets(config, secrets);
    expect(parseConfigWithSecrets(config, secrets)).toEqual({ success: true, data: interpolatedResult });
  });

  it('interpolates secrets and throws on invalid config', () => {
    const config = loadConfigFixture();
    // Missing PROVIDER_URL secret inside the secrets object
    const secrets = {
      AIRNODE_WALLET_MNEMONIC: 'test test test test test test test test test test test junk',
    };

    // TODO: Provide a better error in case there is a missing secret
    expect(parseConfigWithSecrets(config, secrets)).toEqual({
      error: new ValidatorError('Error interpolating secrets. Make sure the secrets format is correct'),
      success: false,
    });
  });
});

describe('unsafeParseConfigWithSecrets', () => {
  it('only interpolates secrets, but does NOT validate the interpolated config', () => {
    const config = loadConfigFixture();
    const secrets = {
      PROVIDER_URL: 'clearly-not-url',
      AIRNODE_WALLET_MNEMONIC: 'test test test test test test test test test test test junk',
    };

    const interpolatedResult = interpolateSecrets(config, secrets);
    expect(unsafeParseConfigWithSecrets(config, secrets)).toEqual(interpolatedResult);
  });
});
