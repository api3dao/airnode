import * as fs from 'fs';
import path from 'path';
import { validateWithTemplate, validateJsonWithTemplate } from '../src';

const tests = fs.readdirSync(path.resolve(__dirname, 'validatorTests'));
const validOutput = { valid: true, messages: [] };

const secretsEnv = {
  PROVIDER_URL: 'http://127.0.0.1:8545',
  AIRNODE_RRP_ADDRESS: '0x0000000000000000000000000000000000000000',
  AIRNODE_WALLET_MNEMONIC: 'achieve climb couple wait accident symbol spy blouse reduce foil echo label',
  SS_CURRENCY_CONVERTER_API_KEY: '<enter your API key>',
  CMC_PRO_API_KEY: '<enter your API key>',
  HTTP_GATEWAY_API_KEY: 'apikey_example_apikey_example_apikey_example',
  HEARTBEAT_API_KEY: '',
  HEARTBEAT_ID: '',
  HEARTBEAT_URL: '',
  CHAIN_ID: '',
  CLOUD_PROVIDER_TYPE: 'aws',
};

describe('validator tests', () => {
  for (const config of tests) {
    if (config.endsWith('.res.json')) {
      continue;
    }

    const testName = config.replace(/\.json$/, '');

    let expectedOutput = validOutput;

    if (fs.existsSync(path.resolve(__dirname, 'validatorTests', `${testName}.res.json`))) {
      expectedOutput = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, 'validatorTests', `${testName}.res.json`), 'utf-8')
      );
    }

    it(`${testName}`, () => {
      expect(validateWithTemplate(path.resolve(__dirname, 'validatorTests', config), 'config')).toEqual(expectedOutput);
    });
  }
});

describe('fixture tests', () => {
  it('node (airnode-node/config/config.json.example)', () =>
    expect(
      validateJsonWithTemplate(
        JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../airnode-node/config/config.json.example'), 'utf-8')),
        'config',
        secretsEnv
      )
    ).toEqual(validOutput));

  it('deployer (airnode-deployer/config/config.json.example)', () =>
    expect(
      validateJsonWithTemplate(
        JSON.parse(
          fs.readFileSync(path.resolve(__dirname, '../../airnode-deployer/config/config.json.example'), 'utf-8')
        ),
        'config',
        secretsEnv
      )
    ).toEqual(validOutput));

  describe('airnode examples', () => {
    const integrationsPath = path.resolve(__dirname, '../../airnode-examples/integrations');
    const integrations = fs
      .readdirSync(integrationsPath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    for (const integration of integrations) {
      it(`${integration}`, () =>
        expect(
          validateJsonWithTemplate(
            JSON.parse(fs.readFileSync(path.resolve(integrationsPath, integration, 'config.json'), 'utf-8')),
            'config',
            secretsEnv
          )
        ).toEqual(validOutput));
    }
  });
});
