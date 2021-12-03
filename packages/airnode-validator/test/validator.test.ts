import * as fs from 'fs';
import path from 'path';
import { validateWithTemplate } from '../src';

const tests = fs.readdirSync(path.resolve(__dirname, 'validatorTests'));
const validOutput = { valid: true, messages: [] };

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
      validateWithTemplate(
        path.resolve(__dirname, '../../airnode-node/config/config.json.example'),
        'config',
        path.resolve(__dirname, '../../airnode-node/config/secrets.env.example')
      )
    ).toEqual(validOutput));

  it('deployer (airnode-deployer/config/config.json.example)', () =>
    expect(
      validateWithTemplate(
        path.resolve(__dirname, '../../airnode-deployer/config/config.json.example'),
        'config',
        path.resolve(__dirname, '../../airnode-deployer/config/secrets.env.example')
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
          validateWithTemplate(
            path.resolve(integrationsPath, integration, 'config.example.json'),
            'config',
            path.resolve(integrationsPath, integration, 'secrets.example.env')
          )
        ).toEqual(validOutput));
    }
  });
});
