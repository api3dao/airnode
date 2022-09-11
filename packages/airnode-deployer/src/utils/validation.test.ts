import { join } from 'path';
import { readFileSync } from 'fs';
import { mockReadFileSync } from '../../test/mock-utils';
import { loadConfig, loadTrustedConfig } from '@api3/airnode-node';
import dotenv from 'dotenv';
import { version as packageVersion } from '../../package.json';

describe('config validation', () => {
  const exampleConfigPath = join(__dirname, '../../config/config.example.json');
  const exampleSecrets = dotenv.parse(readFileSync(join(__dirname, '../../config/secrets.example.env')));

  it('loads the config without validation', () => {
    const notThrowingFunction = () => loadTrustedConfig(exampleConfigPath, exampleSecrets);
    expect(notThrowingFunction).not.toThrow();
  });

  it('loads the config with validation and fails because the config is invalid', () => {
    const invalidConfig = JSON.parse(readFileSync(exampleConfigPath, 'utf-8'));
    invalidConfig.nodeSettings.nodeVersion = '0.4.0';
    mockReadFileSync('config.example.json', JSON.stringify(invalidConfig));

    const throwingFunction = () => loadConfig(exampleConfigPath, exampleSecrets);

    const issues = [
      {
        code: 'custom',
        message: `The "nodeVersion" must be ${packageVersion}`,
        path: ['nodeSettings', 'nodeVersion'],
      },
    ];
    const expectedError = new Error(`Invalid Airnode configuration file: ${JSON.stringify(issues, null, 2)}`);
    expect(throwingFunction).toThrow(expectedError);
  });
});
