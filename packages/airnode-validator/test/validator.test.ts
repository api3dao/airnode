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
