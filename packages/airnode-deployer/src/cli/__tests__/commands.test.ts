import { mockReadFileSync } from '../../../test/mock-utils';
const deployAirnodeSpy = jest.fn();
const removeAirnodeSpy = jest.fn();

jest.mock('@api3/airnode-node', () => ({
  ...jest.requireActual('@api3/airnode-node'),
  version: jest.fn().mockReturnValue('0.5.0'),
}));
jest.mock('../../infrastructure', () => ({
  deployAirnode: deployAirnodeSpy,
  removeAirnode: removeAirnodeSpy,
}));
jest.mock('../../utils', () => ({
  ...jest.requireActual('../../utils'),
  writeReceiptFile: jest.fn(),
}));

import { join } from 'path';
import { deploy, remove, removeWithReceipt } from '../commands';
import { Receipt } from '../../types';

describe('deployer commands', () => {
  it('can deploy Airnode', async () => {
    await deploy(
      join(__dirname, '../../../config/config.example.json'),
      join(__dirname, '../../../config/secrets.example.env'),
      'mocked receipt filename'
    );

    expect(deployAirnodeSpy).toHaveBeenCalledTimes(1);
  });

  it('can remove Airnode', async () => {
    await remove('airnodeAddressShort', 'stage', {
      type: 'aws',
      region: 'region',
      disableConcurrencyReservations: false,
    });

    expect(removeAirnodeSpy).toHaveBeenCalledTimes(1);
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
        nodeVersion: '0.5.0',
        stage: 'stage',
        timestamp: new Date('23 March 2022 14:48 UTC').toISOString(),
      },
    };
    mockReadFileSync('mockedReceiptFile', JSON.stringify(receipt));
    await removeWithReceipt(receiptFile);

    expect(removeAirnodeSpy).toHaveBeenCalledTimes(1);
  });
});
