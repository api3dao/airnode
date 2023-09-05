import fs from 'fs';
import os from 'os';
import path from 'path';
import { mockReadFileSync } from '../../test/mock-utils';
import { receipt } from '@api3/airnode-validator';
import { deploy, removeWithReceipt, rollback } from './commands';
import { version as packageVersion } from '../../package.json';
import * as logger from '../utils/logger';
import { removeAirnode } from '../infrastructure';

const readExampleConfig = () =>
  JSON.parse(fs.readFileSync(path.join(__dirname, '../../config/config.example.json'), 'utf-8'));

jest.mock('../infrastructure', () => ({
  ...jest.requireActual('../infrastructure'),
  deployAirnode: jest.fn(),
  removeAirnode: jest.fn(),
  saveDeploymentFiles: jest.fn(),
}));

jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  writeReceiptFile: jest.fn(),
}));

jest.spyOn(fs, 'appendFileSync').mockImplementation(() => jest.fn());
jest.spyOn(fs, 'mkdirSync').mockImplementation();
logger.setLogsDirectory('/config/logs/');
const mockSpinner = {
  stop: jest.fn(),
  succeed: jest.fn(),
};

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
  let mockSaveDeploymentFiles: jest.SpyInstance;
  let mockWriteReceiptFile: jest.SpyInstance;
  let loggerFailSpy: jest.SpyInstance;
  let loggerSucceedSpy: jest.SpyInstance;
  let tempConfigDir: string;

  beforeEach(() => {
    mockDeployAirnode = jest.requireMock('../infrastructure').deployAirnode;
    mockRemoveAirnode = jest.requireMock('../infrastructure').removeAirnode;
    mockSaveDeploymentFiles = jest.requireMock('../infrastructure').saveDeploymentFiles;
    mockWriteReceiptFile = jest.requireMock('../utils').writeReceiptFile;
    loggerFailSpy = jest.spyOn(logger, 'fail').mockImplementation(() => {});
    loggerSucceedSpy = jest.spyOn(logger, 'succeed').mockImplementation(() => {});
    jest
      .spyOn(logger, 'getSpinner')
      .mockImplementation(
        () => ({ start: () => mockSpinner, succeed: () => mockSpinner }) as unknown as logger.Spinner
      );
    jest.spyOn(logger, 'inDebugMode').mockImplementation(() => false);
    tempConfigDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airnode-rollback-test'));
    fs.copyFileSync(path.join(__dirname, '../../config/config.example.json'), path.join(tempConfigDir, 'config.json'));
    fs.copyFileSync(path.join(__dirname, '../../config/secrets.example.env'), path.join(tempConfigDir, 'secrets.env'));
    jest.spyOn(fs, 'mkdtempSync').mockImplementation(() => tempConfigDir);
    jest.spyOn(fs, 'rmSync').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(tempConfigDir, { recursive: true });
  });

  it('can deploy Airnode', async () => {
    mockDeployAirnode.mockReturnValueOnce({});

    await deploy(
      path.join(__dirname, '../../config/config.example.json'),
      path.join(__dirname, '../../config/secrets.example.env'),
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
        path.join(__dirname, '../../config/config.example.json'),
        path.join(__dirname, '../../config/secrets.example.env'),
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
        path.join(__dirname, '../../config/config.example.json'),
        path.join(__dirname, '../../config/secrets.example.env'),
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
        path.join(__dirname, '../../config/config.example.json'),
        path.join(__dirname, '../../config/secrets.example.env'),
        'mockedReceiptFile',
        true
      )
    ).rejects.toThrow(['Deployment error:', 'deployment failed', 'Removal error:', `removal failed`].join('\n'));

    expect(mockDeployAirnode).toHaveBeenCalledTimes(1);
    expect(mockRemoveAirnode).toHaveBeenCalledTimes(1);
    expect(mockWriteReceiptFile).toHaveBeenCalledTimes(1);
    expect(loggerFailSpy).toHaveBeenCalledTimes(2);
  });

  it('rollbacks the Airnode deployment', async () => {
    const deploymentId = 'aws7195b548';
    const deploymentVersion = '1f8210a2';
    mockDeployAirnode.mockReturnValueOnce({});

    await rollback(deploymentId, deploymentVersion, 'mocked receipt filename', true);

    expect(mockSaveDeploymentFiles).toHaveBeenCalledTimes(1);
    expect(mockDeployAirnode).toHaveBeenCalledTimes(1);
    expect(mockWriteReceiptFile).toHaveBeenCalledTimes(1);
  });

  describe('fail with invalid node version', () => {
    it('when using deploy', async () => {
      const config = readExampleConfig();
      (config.nodeSettings.nodeVersion as any) = '0.4.0';
      mockReadFileSync('config.example.json', JSON.stringify(config));

      const throwingFn = () =>
        deploy(
          path.join(__dirname, '../../config/config.example.json'),
          path.join(__dirname, '../../config/secrets.example.env'),
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
      const throwingFn = () => removeWithReceipt(path.join(__dirname, '../../test/fixtures/invalid-receipt.json'));

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
