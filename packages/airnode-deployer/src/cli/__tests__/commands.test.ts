import { join } from 'path';
import { mockReadFileSync } from '../../../test/mock-utils';
import { version as packageVersion } from '../../../package.json';
import { deploy, remove, removeWithReceipt } from '../commands';
import { Receipt } from '../../types';

jest.mock('../../infrastructure', () => ({
  ...jest.requireActual('../../infrastructure'),
  deployAirnode: jest.fn(),
  removeAirnode: jest.fn(),
}));

jest.mock('../../utils', () => ({
  ...jest.requireActual('../../utils'),
  writeReceiptFile: jest.fn(),
}));

describe('deployer commands', () => {
  let mockDeployAirnode: jest.SpyInstance;
  let mockRemoveAirnode: jest.SpyInstance;
  let mockWriteReceiptFile: jest.SpyInstance;

  beforeEach(() => {
    mockDeployAirnode = jest.requireMock('../../infrastructure').deployAirnode;
    mockRemoveAirnode = jest.requireMock('../../infrastructure').removeAirnode;
    mockWriteReceiptFile = jest.requireMock('../../utils').writeReceiptFile;
  });

  it('can deploy Airnode', async () => {
    await deploy(
      join(__dirname, '../../../config/config.example.json'),
      join(__dirname, '../../../config/secrets.example.env'),
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
