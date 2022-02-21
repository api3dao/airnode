import { mockConsole } from '../../test/mock-utils';
import fs from 'fs';
import { loadConfig } from './files';
import * as fixtures from '../../test/fixtures';

mockConsole();

describe('deployer-validation', () => {
  it('loads the config without validation', async () => {
    const config = fixtures.buildConfig();
    jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(JSON.stringify(config));

    const notThrowingFunction = () => loadConfig('config.json', process.env, false);
    expect(notThrowingFunction).not.toThrow();
  });

  it('loads the config with validation and fails because the config is invalid', async () => {
    const config = fixtures.buildConfig();
    jest.spyOn(fs, 'readFileSync').mockReturnValueOnce(JSON.stringify(config));

    const throwingFunction = () => loadConfig('config.json', process.env, true);
    expect(throwingFunction).toThrow();
  });
});
