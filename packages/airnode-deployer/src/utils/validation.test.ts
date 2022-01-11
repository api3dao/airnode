import fs from 'fs';
import { loadConfig } from './files';
import * as fixtures from '../../test/fixtures';

describe('deployer-validation', () => {
  it('loads the config without validation', () => {
    const config = fixtures.buildConfig();
    jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(JSON.stringify(config));

    const notThrowingFunction = () => loadConfig('config.json', process.env, false);
    expect(notThrowingFunction).not.toThrow();
  });

  it('loads the config with validation and fails because the config is invalid', () => {
    const config = fixtures.buildConfig();
    jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(JSON.stringify(config));

    const throwingFunction = () => loadConfig('config.json', process.env, true);
    expect(throwingFunction).toThrow();
  });
});
