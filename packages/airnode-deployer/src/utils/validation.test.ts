import { mockReadFileSync } from '../../test/mock-utils';
import { loadConfig, loadTrustedConfig } from '@api3/airnode-node';
import * as fixtures from '../../test/fixtures';

describe('config validation', () => {
  it('loads the config without validation', () => {
    const config = fixtures.buildConfig();
    mockReadFileSync('config.json', JSON.stringify(config));

    const notThrowingFunction = () => loadTrustedConfig('config.json', process.env);
    expect(notThrowingFunction).not.toThrow();
  });

  it('loads the config with validation and fails because the config is invalid', async () => {
    const config = fixtures.buildConfig();
    mockReadFileSync('config.json', JSON.stringify(config));

    const throwingFunction = () => loadConfig('config.json', process.env);
    expect(throwingFunction).toThrow();
  });
});
