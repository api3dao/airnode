import fs from 'fs';
import { loadTrustedConfig, loadConfig } from './files';
import * as fixtures from '../../test/fixtures';

describe('config validation', () => {
  it('loads the config without validation', () => {
    const config = fixtures.buildConfig();
    jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(JSON.stringify(config));

    const notThrowingFunction = () => loadTrustedConfig('config.json', process.env);
    expect(notThrowingFunction).not.toThrow();
  });

  it('loads the config with validation and fails because the config is invalid', () => {
    const config = fixtures.buildConfig();
    jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(JSON.stringify(config));

    const throwingFunction = () => loadConfig('config.json', process.env);
    expect(throwingFunction).toThrow();
  });
});
