import { join } from 'path';
import { mockReadFileSync } from '../../test/mock-utils';
import { readFileSync } from 'fs';
import { deploy, remove, removeWithReceipt } from './commands';
import { version as packageVersion } from '../../package.json';
import { Receipt } from '../types';
import * as logger from '../utils/logger';

const readExampleConfig = () => JSON.parse(readFileSync(join(__dirname, '../../config/config.example.json'), 'utf-8'));

jest.mock('../infrastructure', () => ({
  ...jest.requireActual('../infrastructure'),
  deployAirnode: jest.fn(),
  removeAirnode: jest.fn(),
}));

jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  writeReceiptFile: jest.fn(),
}));

describe('deployer commands', () => {
  let mockDeployAirnode: jest.SpyInstance;
  let mockRemoveAirnode: jest.SpyInstance;
  let mockWriteReceiptFile: jest.SpyInstance;

  beforeEach(() => {
    mockDeployAirnode = jest.requireMock('../infrastructure').deployAirnode;
    mockDeployAirnode.mockReturnValueOnce({});
    mockRemoveAirnode = jest.requireMock('../infrastructure').removeAirnode;
    mockWriteReceiptFile = jest.requireMock('../utils').writeReceiptFile;
  });

  it('can deploy Airnode', async () => {
    await deploy(
      join(__dirname, '../../config/config.example.json'),
      join(__dirname, '../../config/secrets.example.env'),
      'mocked receipt filename'
    );

    expect(mockDeployAirnode).toHaveBeenCalledTimes(1);
    expect(mockWriteReceiptFile).toHaveBeenCalledTimes(1);
  });

  it('can remove Airnode', async () => {
    await remove('airnodeAddressShort', 'stage', {
      type: 'aws',
      region: 'region',
      disableConcurrencyReservations: false,
    });

    expect(mockRemoveAirnode).toHaveBeenCalledTimes(1);
  });

  it('can remove Airnode with receipt', async () => {
    const receiptFile = 'mockedReceiptFile';
    const receipt: Receipt = {
      airnodeWallet: {
        airnodeAddress: '0xF347ADEd76F7AC2013e379078738aBfF75780C2e',
        airnodeAddressShort: 'f347ade',
        airnodeXpub:
          'xpub6CZqcAR5RtRPYYGbJe7MzFGbJkJ86ub9KtYvTtenPQRgxFXNCmR7woXjV8SdFPWrTBooAqWVLKe19KWBnaktkwUsvSEfH18HyxeNZQRJq8k',
      },
      api: {},
      deployment: {
        airnodeAddressShort: 'f347ade',
        cloudProvider: {
          type: 'gcp',
          region: 'us-east1',
          projectId: 'airnode-4',
          disableConcurrencyReservations: false,
        },
        nodeVersion: packageVersion,
        stage: 'stage',
        timestamp: new Date('23 March 2022 14:48 UTC').toISOString(),
      },
    };
    mockReadFileSync('mockedReceiptFile', JSON.stringify(receipt));
    await removeWithReceipt(receiptFile);

    expect(mockRemoveAirnode).toHaveBeenCalledTimes(1);
  });
});

describe('deployer commands fail with invalid node version', () => {
  it('when using deploy', async () => {
    const config = readExampleConfig();
    (config.nodeSettings.nodeVersion as any) = '0.4.0';
    mockReadFileSync('config.example.json', JSON.stringify(config));

    const throwingFn = () =>
      deploy(
        join(__dirname, '../../config/config.example.json'),
        join(__dirname, '../../config/secrets.example.env'),
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

    const throwingFn = () => removeWithReceipt(join(__dirname, '../../test/fixtures/invalid-receipt.json'));

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
