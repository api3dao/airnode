import { join } from 'path';
import { mockReadFileSync } from '../../../test/mock-utils';
import { readFileSync } from 'fs';
import { version as packageVersion } from '../../../package.json';
import * as logger from '../../utils/logger';

import { deploy, removeWithReceipt } from '../commands';

const readExampleConfig = () =>
  JSON.parse(readFileSync(join(__dirname, '../../../config/config.example.json'), 'utf-8'));

describe('deployer commands fail with invalid node version', () => {
  it('when using deploy', async () => {
    const config = readExampleConfig();
    (config.nodeSettings.nodeVersion as any) = '0.4.0';
    mockReadFileSync('config.example.json', JSON.stringify(config));

    const throwingFn = () =>
      deploy(
        join(__dirname, '../../../config/config.example.json'),
        join(__dirname, '../../../config/secrets.example.env'),
        'mocked receipt filename'
      );

    const issues = [
      {
        code: 'custom',
        message: `The "nodeVersion" must be ${packageVersion}`,
        path: ['nodeSettings', 'nodeVersion'],
      },
    ];
    const expectedError = new Error(`Invalid Airnode configuration file: ${JSON.stringify(issues, null, 2)}`);
    await expect(throwingFn).rejects.toThrow(expectedError);
  });

  it('when using removeWithReceipt', async () => {
    const failSpy = jest.spyOn(logger, 'fail').mockImplementation(() => {});

    const throwingFn = () => removeWithReceipt(join(__dirname, '../../../test/fixtures/invalid-receipt.json'));

    const issues = [
      {
        code: 'custom',
        message: `The "nodeVersion" must be ${packageVersion}`,
        path: ['deployment', 'nodeVersion'],
      },
    ];
    const expectedError = new Error(`Invalid Airnode receipt file: ${JSON.stringify(issues, null, 2)}`);
    await expect(throwingFn).rejects.toThrow(expectedError);
    expect(failSpy).toHaveBeenCalledTimes(1);
  });
});
