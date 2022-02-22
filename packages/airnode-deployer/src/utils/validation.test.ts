import fs from 'fs';
import { loadConfig } from './files';
import * as fixtures from '../../test/fixtures';

const original = fs.readFileSync;

describe('deployer-validation', () => {
  it('loads the config without validation', () => {
    const config = fixtures.buildConfig();
    jest.spyOn(fs, 'readFileSync').mockImplementation((...args) => {
      const path = args[0].toString();
      if (path.includes('config.json')) {
        return JSON.stringify(config);
      }
      return original(...args);
    });

    const notThrowingFunction = () => loadConfig('config.json', process.env, false);
    expect(notThrowingFunction).not.toThrow();
  });

  it('loads the config with validation and fails because the config is invalid', () => {
    const config = fixtures.buildConfig();
    jest.spyOn(fs, 'readFileSync').mockImplementation((...args) => {
      const path = args[0].toString();
      if (path.includes('config.json')) {
        return JSON.stringify(config);
      }
      return original(...args);
    });

    const throwingFunction = () => loadConfig('config.json', process.env, true);
    expect(throwingFunction).toThrow();
  });
});
