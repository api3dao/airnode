import * as fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import template from 'lodash/template';
import { validateWithTemplate, validateJsonWithTemplate } from '../src';

const tests = fs.readdirSync(path.resolve(__dirname, 'validatorTests'));
const validOutput = { valid: true, messages: [] };

// Regular expression that does not match anything, ensuring no escaping or interpolation happens
// https://github.com/lodash/lodash/blob/4.17.15/lodash.js#L199
const NO_MATCH_REGEXP = /($^)/;
// Regular expression matching ES template literal delimiter (${}) with escaping
// https://github.com/lodash/lodash/blob/4.17.15/lodash.js#L175
const ES_MATCH_REGEXP = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;

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
  it('node (airnode-node/config/config.json.example)', () => {
    const interpolated = template(
      fs.readFileSync(path.resolve(__dirname, '../../airnode-node/config/config.json.example'), 'utf-8'),
      {
        escape: NO_MATCH_REGEXP,
        evaluate: NO_MATCH_REGEXP,
        interpolate: ES_MATCH_REGEXP,
      }
    )(dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../../airnode-node/config/secrets.env.example'))));
    expect(validateJsonWithTemplate(JSON.parse(interpolated), 'config')).toEqual(validOutput);
  });

  it('deployer (airnode-deployer/config/config.json.example)', () => {
    const interpolated = template(
      fs.readFileSync(path.resolve(__dirname, '../../airnode-deployer/config/config.json.example'), 'utf-8'),
      {
        escape: NO_MATCH_REGEXP,
        evaluate: NO_MATCH_REGEXP,
        interpolate: ES_MATCH_REGEXP,
      }
    )(dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../../airnode-deployer/config/secrets.env.example'))));
    expect(validateJsonWithTemplate(JSON.parse(interpolated), 'config')).toEqual(validOutput);
  });

  describe('airnode examples', () => {
    const integrationsPath = path.resolve(__dirname, '../../airnode-examples/integrations');
    const integrations = fs
      .readdirSync(integrationsPath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    for (const integration of integrations) {
      it(`${integration}`, () => {
        const interpolated = template(
          fs.readFileSync(path.resolve(integrationsPath, integration, 'config.json'), 'utf-8'),
          {
            escape: NO_MATCH_REGEXP,
            evaluate: NO_MATCH_REGEXP,
            interpolate: ES_MATCH_REGEXP,
          }
        )(dotenv.parse(fs.readFileSync(path.resolve(integrationsPath, integration, 'secrets.example.env'))));
        expect(validateJsonWithTemplate(JSON.parse(interpolated), 'config')).toEqual(validOutput);
      });
    }
  });
});
