import { join } from 'path';
import { readFileSync } from 'fs';
import forEach from 'lodash/forEach';
import { ZodError } from 'zod';
import { parseConfigWithSecrets, unsafeParseConfigWithSecrets, parseSecrets } from './api';
import { Config } from '../config';

const loadConfigFixture = (): Config =>
  // We type the result as "Config", however it will not pass validation in it's current state because the secrets are
  // not interpolated
  JSON.parse(readFileSync(join(__dirname, '../../test/fixtures/config.valid.json')).toString());

const interpolateSecrets = (config: unknown, secrets: Record<string, string>) => {
  let strConfig = JSON.stringify(config);

  forEach(secrets, (val, key) => {
    strConfig = strConfig.replace('${' + key + '}', JSON.stringify(val).slice(1, -1));
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
      { environment: 'Node', timeoutMs: 100, value: 'const someVar = 123; console.log(`\\${someVar}`);' },
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

  it('fails when a secret is empty', () => {
    const config = loadConfigFixture();
    const secrets = {
      PROVIDER_URL: 'http://127.0.0.1:8545/',
      AIRNODE_WALLET_MNEMONIC: '',
    };

    const emptyError = new ZodError([
      {
        code: 'too_small',
        minimum: 1,
        type: 'string',
        inclusive: true,
        exact: false,
        message: 'Secret cannot be empty',
        path: ['AIRNODE_WALLET_MNEMONIC'],
      },
    ]);

    expect(parseSecrets(secrets)).toEqual({
      error: emptyError,
      success: false,
    });

    expect(parseConfigWithSecrets(config, secrets)).toEqual({
      error: emptyError,
      success: false,
    });
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
        error: new ZodError([
          {
            validation: 'regex',
            code: 'invalid_string',
            message: 'Secret name is not a valid. Secret name must match /^[A-Z][A-Z0-9_]*$/',
            path: ['0123STAGE_NAME'],
          },
        ]),
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
        error: new ZodError([
          {
            validation: 'regex',
            code: 'invalid_string',
            message: 'Secret name is not a valid. Secret name must match /^[A-Z][A-Z0-9_]*$/',
            path: ['STAGE-NAME'],
          },
        ]),
        success: false,
      });
    });
  });

  it('accepts valid config and interpolates chain authorizations secrets', () => {
    const config = loadConfigFixture();
    config.chains[0].authorizations.requesterEndpointAuthorizations = {
      ['${ENDPOINT_ID_1}']: ['${REQUESTER_1}'],
      '0xbe74f8e5e89e096379ffd218a1c357c32fa10da7c131d75c639f99bc8eaeb9c7': [
        '0x15391C3E06Db67FD72bd80747D131d514E1EA674',
      ],
    };

    const secrets = {
      PROVIDER_URL: 'http://127.0.0.1:8545/',
      AIRNODE_WALLET_MNEMONIC: 'test test test test test test test test test test test junk',
      ENDPOINT_ID_1: '0xfb87102cdabadf905321521ba0b3cbf74ad09c5d400ac2eccdbef8d6143e78c4',
      REQUESTER_1: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    };

    const interpolatedResult = interpolateSecrets(config, secrets);
    expect(parseConfigWithSecrets(config, secrets)).toEqual({ success: true, data: interpolatedResult });
  });

  it('fails with invalid chain authorizations secrets', () => {
    const config = loadConfigFixture();
    config.chains[0].authorizations.requesterEndpointAuthorizations = { ['${ENDPOINT_ID_1}']: ['${REQUESTER_1}'] };

    const secrets = {
      PROVIDER_URL: 'http://127.0.0.1:8545/',
      AIRNODE_WALLET_MNEMONIC: 'test test test test test test test test test test test junk',
      ENDPOINT_ID_1: 'invalid',
      REQUESTER_1: 'invalid',
    };

    expect(parseConfigWithSecrets(config, secrets)).toEqual({
      error: new ZodError([
        {
          validation: 'regex',
          code: 'invalid_string',
          message: 'Invalid',
          path: ['chains', 0, 'authorizations', 'requesterEndpointAuthorizations', 'invalid', 0],
        },
      ]),
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

it('works with multiline secrets', () => {
  const config = loadConfigFixture();
  config.ois[0].endpoints[0].description = '${MULTILINE_VALUE}';
  const secrets = {
    PROVIDER_URL: 'http://127.0.0.1:8545/',
    AIRNODE_WALLET_MNEMONIC: 'test test test test test test test test test test test junk',
    MULTILINE_VALUE: 'MULTI\nLINE\nVALUE',
  };

  const interpolatedResult = interpolateSecrets(config, secrets);
  expect(parseConfigWithSecrets(config, secrets)).toEqual({ success: true, data: interpolatedResult });
});
