import { join } from 'path';
import { readFileSync } from 'fs';
import forEach from 'lodash/forEach';
import { parseConfigWithSecrets, unsafeParseConfigWithSecrets } from './api';
import { Config } from '../config';

const loadConfigFixture = (): Config =>
  // We type the result as "Config", however it will not pass validation in it's current state because the secrets are
  // not interpolated
  JSON.parse(readFileSync(join(__dirname, '../../test/fixtures/config.valid.json')).toString());

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

    expect(parseConfigWithSecrets(config, secrets)).toEqual({
      error: new Error('Secrets interpolation failed. Caused by: PROVIDER_URL is not defined'),
      success: false,
    });
  });

  it('can use "\\" to escape interpolation', () => {
    const config = loadConfigFixture();
    config.ois[0].endpoints[0].postProcessingSpecifications = [
      { environment: 'Node 14', timeoutMs: 100, value: 'const someVar = 123; console.log(`\\${someVar}`);' },
    ];
    const secrets = {
      PROVIDER_URL: 'http://127.0.0.1:8545/',
      AIRNODE_WALLET_MNEMONIC: 'test test test test test test test test test test test junk',
    };

    const interpolatedResult = interpolateSecrets(config, secrets);
    interpolatedResult.ois[0].endpoints[0].postProcessingSpecifications[0].value =
      'const someVar = 123; console.log(`${someVar}`);';
    expect(parseConfigWithSecrets(config, secrets)).toEqual({ success: true, data: interpolatedResult });
  });

  describe('cases when secrets are not valid JS identifiers', () => {
    it('fails when a secret starts with a number', () => {
      const config = loadConfigFixture();
      config.nodeSettings.stage = '${0123STAGE_NAME}';
      const secrets = {
        PROVIDER_URL: 'http://127.0.0.1:8545/',
        AIRNODE_WALLET_MNEMONIC: 'test test test test test test test test test test test junk',
        ['0123STAGE_NAME']: 'dev',
      };

      expect(parseConfigWithSecrets(config, secrets)).toEqual({
        error: new Error('Secrets interpolation failed. Caused by: Invalid or unexpected token'),
        success: false,
      });
    });

    it('fails when a secret contains a "-" character', () => {
      const config = loadConfigFixture();
      config.nodeSettings.stage = '${STAGE-NAME}';
      const secrets = {
        PROVIDER_URL: 'http://127.0.0.1:8545/',
        AIRNODE_WALLET_MNEMONIC: 'test test test test test test test test test test test junk',
        ['STAGE-NAME']: 'dev',
      };

      expect(parseConfigWithSecrets(config, secrets)).toEqual({
        error: new Error('Secrets interpolation failed. Caused by: STAGE is not defined'),
        success: false,
      });
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
