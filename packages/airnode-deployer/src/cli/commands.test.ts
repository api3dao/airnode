const deployAirnodeSpy = jest.fn();
const removeAirnodeSpy = jest.fn();

jest.mock('@api3/airnode-node', () => ({
  ...jest.requireActual('@api3/airnode-node'),
  version: jest
    .fn()
    .mockReturnValueOnce('0.3.0')
    .mockReturnValueOnce('0.2.0')
    .mockReturnValueOnce('0.2.0')
    .mockReturnValue('0.3.0'),
}));
jest.mock('../infrastructure', () => ({
  deployAirnode: deployAirnodeSpy,
  removeAirnode: removeAirnodeSpy,
}));
jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  writeReceiptFile: jest.fn(),
}));

import { join } from 'path';
import fs from 'fs';
import { deploy, remove, removeWithReceipt } from './commands';
import { Receipt } from '../types';

describe('deployer commands', () => {
  it('can deploy Airnode', async () => {
    await deploy(
      join(__dirname, '../../config/config.json.example'),
      join(__dirname, '../../config/secrets.env.example'),
      'mocked receipt filename',
      false
    );

    expect(deployAirnodeSpy).toHaveBeenCalledTimes(1);
  });

  it('fails deployment when the node version does not match the config version', async () => {
    await expect(
      deploy(
        join(__dirname, '../../config/config.json.example'),
        join(__dirname, '../../config/secrets.env.example'),
        'mocked receipt filename',
        false
      )
    ).rejects.toThrow();
  });

  it('deploys incompatible version, when validation is disabled', async () => {
    await deploy(
      join(__dirname, '../../config/config.json.example'),
      join(__dirname, '../../config/secrets.env.example'),
      'mocked receipt filename',
      true
    );

    expect(deployAirnodeSpy).toHaveBeenCalledTimes(1);
  });

  it('can remove Airnode', async () => {
    await remove('airnodeAddressShort', 'stage', { type: 'aws', region: 'region' });

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
        },
        nodeVersion: '0.4.0',
        stage: 'stage',
      },
    };
    jest.spyOn(fs, 'readFileSync').mockImplementationOnce(() => JSON.stringify(receipt, null, 2));
    await removeWithReceipt(receiptFile);

    expect(removeAirnodeSpy).toHaveBeenCalledTimes(1);
  });
});
