import { join } from 'path';
import { mockReadFileSync } from '../../test/mock-utils';
import { readFileSync } from 'fs';
import { receipt } from '@api3/airnode-validator';
import { deploy, removeWithReceipt } from './commands';
import { version as packageVersion } from '../../package.json';
import * as logger from '../utils/logger';
import { removeAirnode } from '../infrastructure';

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

const gcpReceipt: receipt.Receipt = {
  airnodeWallet: {
    airnodeAddress: '0xF347ADEd76F7AC2013e379078738aBfF75780C2e',
    airnodeXpub:
      'xpub6CZqcAR5RtRPYYGbJe7MzFGbJkJ86ub9KtYvTtenPQRgxFXNCmR7woXjV8SdFPWrTBooAqWVLKe19KWBnaktkwUsvSEfH18HyxeNZQRJq8k',
  },
  deployment: {
    deploymentId: 'awsfc684864',
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
  success: true,
};

describe('deployer commands', () => {
  let mockDeployAirnode: jest.SpyInstance;
  let mockRemoveAirnode: jest.SpyInstance;
  let mockWriteReceiptFile: jest.SpyInstance;
  let loggerFailSpy: jest.SpyInstance;
  let loggerSucceedSpy: jest.SpyInstance;

  beforeEach(() => {
    mockDeployAirnode = jest.requireMock('../infrastructure').deployAirnode;
    mockRemoveAirnode = jest.requireMock('../infrastructure').removeAirnode;
    mockWriteReceiptFile = jest.requireMock('../utils').writeReceiptFile;
    loggerFailSpy = jest.spyOn(logger, 'fail').mockImplementation(() => {});
    loggerSucceedSpy = jest.spyOn(logger, 'succeed').mockImplementation(() => {});
  });

  it('can deploy Airnode', async () => {
    mockDeployAirnode.mockReturnValueOnce({});

    await deploy(
      join(__dirname, '../../config/config.example.json'),
      join(__dirname, '../../config/secrets.example.env'),
      'mocked receipt filename',
      true
    );

    expect(mockDeployAirnode).toHaveBeenCalledTimes(1);
    expect(mockWriteReceiptFile).toHaveBeenCalledTimes(1);
  });

  it('can remove Airnode', async () => {
    await removeAirnode('aws40207f25');

    expect(mockRemoveAirnode).toHaveBeenCalledTimes(1);
  });

  it('can remove Airnode with receipt', async () => {
    const receiptFile = 'mockedReceiptFile';
    mockReadFileSync('mockedReceiptFile', JSON.stringify(gcpReceipt));
    await removeWithReceipt(receiptFile);

    expect(mockRemoveAirnode).toHaveBeenCalledTimes(1);
  });

  it('writes receipt and removes Airnode when deployment fails', async () => {
    mockDeployAirnode.mockImplementation(() => {
      throw new Error('deployment failed');
    });
    mockReadFileSync('mockedReceiptFile', JSON.stringify(gcpReceipt));

    await expect(() =>
      deploy(
        join(__dirname, '../../config/config.example.json'),
        join(__dirname, '../../config/secrets.example.env'),
        'mockedReceiptFile',
        true
      )
    ).rejects.toThrow(['Deployment error:', 'deployment failed'].join('\n'));

    expect(mockDeployAirnode).toHaveBeenCalledTimes(1);
    expect(mockRemoveAirnode).toHaveBeenCalledTimes(1);
    expect(mockWriteReceiptFile).toHaveBeenCalledTimes(1);
    expect(loggerFailSpy).toHaveBeenCalledTimes(1);
    expect(loggerSucceedSpy).toHaveBeenCalledTimes(1);
  });

  it('only writes receipt when deployment fails and "auto remove" is disabled', async () => {
    mockDeployAirnode.mockImplementation(() => {
      throw new Error('deployment failed');
    });

    await expect(() =>
      deploy(
        join(__dirname, '../../config/config.example.json'),
        join(__dirname, '../../config/secrets.example.env'),
        'mockedReceiptFile',
        false
      )
    ).rejects.toThrow('deployment failed');

    expect(mockRemoveAirnode).toHaveBeenCalledTimes(0);
    expect(loggerSucceedSpy).toHaveBeenCalledTimes(0);
  });

  it('prints error details when both deployment and removal fail', async () => {
    mockDeployAirnode.mockImplementation(() => {
      throw new Error('deployment failed');
    });
    mockRemoveAirnode.mockImplementation(() => {
      throw new Error('removal failed');
    });
    mockReadFileSync('mockedReceiptFile', JSON.stringify(gcpReceipt));

    await expect(() =>
      deploy(
        join(__dirname, '../../config/config.example.json'),
        join(__dirname, '../../config/secrets.example.env'),
        'mockedReceiptFile',
        true
      )
    ).rejects.toThrow(['Deployment error:', 'deployment failed', 'Removal error:', `removal failed`].join('\n'));

    expect(mockDeployAirnode).toHaveBeenCalledTimes(1);
    expect(mockRemoveAirnode).toHaveBeenCalledTimes(1);
    expect(mockWriteReceiptFile).toHaveBeenCalledTimes(1);
    expect(loggerFailSpy).toHaveBeenCalledTimes(2);
  });

  describe('fail with invalid node version', () => {
    it('when using deploy', async () => {
      const config = readExampleConfig();
      (config.nodeSettings.nodeVersion as any) = '0.4.0';
      mockReadFileSync('config.example.json', JSON.stringify(config));

      const throwingFn = () =>
        deploy(
          join(__dirname, '../../config/config.example.json'),
          join(__dirname, '../../config/secrets.example.env'),
          'mocked receipt filename',
          true
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
      expect(loggerFailSpy).toHaveBeenCalledTimes(1);
    });
  });
});
