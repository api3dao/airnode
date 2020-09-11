const fulfillWalletDesignationMock = jest.fn();
jest.mock('ethers', () => ({
  ethers: {
    ...jest.requireActual('ethers'),
    Contract: jest.fn().mockImplementation(() => ({
      fulfillWalletDesignation: fulfillWalletDesignationMock,
    })),
  },
}));

import { ethers } from 'ethers';
import * as fixtures from 'test/fixtures';
import { RequestStatus } from 'src/types';
import * as designations from './wallet-designations';

describe('submitWalletDesignation', () => {
  const gasPrice = ethers.BigNumber.from('1000');
  const txOpts = { gasLimit: 150_000, gasPrice, nonce: 5 };

  it('submits a fulfill transaction for pending requests', async () => {
    const contract = new ethers.Contract('address', ['ABI']);
    contract.fulfillWalletDesignation.mockResolvedValueOnce({ hash: '0xsuccessful' });
    const gasPrice = ethers.BigNumber.from('1000');
    const walletDesignation = fixtures.requests.createWalletDesignation({ nonce: 5, status: RequestStatus.Pending });
    const [logs, err, data] = await designations.submitWalletDesignation(contract, walletDesignation, { gasPrice });
    expect(logs).toEqual([
      {
        level: 'INFO',
        message: `Submitting wallet designation index:${walletDesignation.walletIndex} for Request:${walletDesignation.id}...`,
      },
    ]);
    expect(err).toEqual(null);
    expect(data).toEqual({ hash: '0xsuccessful' });
    expect(contract.fulfillWalletDesignation).toHaveBeenCalledTimes(1);
    expect(contract.fulfillWalletDesignation).toHaveBeenCalledWith(
      walletDesignation.id,
      walletDesignation.walletIndex,
      txOpts
    );
  });

  it('does nothing if the request is already fulfilled', async () => {
    const contract = new ethers.Contract('address', ['ABI']);
    const gasPrice = ethers.BigNumber.from('1000');
    const walletDesignation = fixtures.requests.createWalletDesignation({ nonce: 5, status: RequestStatus.Fulfilled });
    const [logs, err, data] = await designations.submitWalletDesignation(contract, walletDesignation, { gasPrice });
    expect(logs).toEqual([]);
    expect(err).toEqual(null);
    expect(data).toEqual(null);
    expect(contract.fulfillWalletDesignation).not.toHaveBeenCalled();
  });

  it('does nothing if the request is blocked or errored', async () => {
    const contract = new ethers.Contract('address', ['ABI']);
    // NOTE: a wallet designation should not be able to become "errored" or "blocked", but this
    // is just in case that changes
    const blocked = fixtures.requests.createWalletDesignation({ status: RequestStatus.Blocked });
    const errored = fixtures.requests.createWalletDesignation({ status: RequestStatus.Errored });

    const blockedRes = await designations.submitWalletDesignation(contract, blocked, { gasPrice });
    const erroredRes = await designations.submitWalletDesignation(contract, errored, { gasPrice });

    expect(blockedRes[0]).toEqual([
      {
        level: 'INFO',
        message: `Wallet designation index:${blocked.walletIndex} for Request:${blocked.id} not actioned as it has status:${blocked.status}`,
      },
    ]);
    expect(blockedRes[1]).toEqual(null);
    expect(blockedRes[2]).toEqual(null);
    expect(erroredRes[0]).toEqual([
      {
        level: 'INFO',
        message: `Wallet designation index:${errored.walletIndex} for Request:${errored.id} not actioned as it has status:${errored.status}`,
      },
    ]);
    expect(erroredRes[1]).toEqual(null);
    expect(erroredRes[2]).toEqual(null);
    expect(contract.fulfillWalletDesignation).not.toHaveBeenCalled();
  });

  it('returns an error if the fulfill transaction fails', async () => {
    const contract = new ethers.Contract('address', ['ABI']);
    contract.fulfillWalletDesignation.mockRejectedValueOnce(new Error('Server did not respond'));
    const gasPrice = ethers.BigNumber.from('1000');
    const walletDesignation = fixtures.requests.createWalletDesignation({ nonce: 5, status: RequestStatus.Pending });
    const [logs, err, data] = await designations.submitWalletDesignation(contract, walletDesignation, { gasPrice });
    expect(logs).toEqual([
      {
        level: 'INFO',
        message: `Submitting wallet designation index:${walletDesignation.walletIndex} for Request:${walletDesignation.id}...`,
      },
      {
        level: 'ERROR',
        message: `Error submitting wallet designation index:${walletDesignation.walletIndex} for Request:${walletDesignation.id}. Error: Server did not respond`,
      },
    ]);
    expect(err).toEqual(new Error('Server did not respond'));
    expect(data).toEqual(null);
    expect(contract.fulfillWalletDesignation).toHaveBeenCalledTimes(1);
    expect(contract.fulfillWalletDesignation).toHaveBeenCalledWith(
      walletDesignation.id,
      walletDesignation.walletIndex,
      txOpts
    );
  });

  it('returns null if the fulfill transaction returns null', async () => {
    const contract = new ethers.Contract('address', ['ABI']);
    contract.fulfillWalletDesignation.mockResolvedValueOnce(null);
    const gasPrice = ethers.BigNumber.from('1000');
    const walletDesignation = fixtures.requests.createWalletDesignation({ nonce: 5, status: RequestStatus.Pending });
    const [logs, err, data] = await designations.submitWalletDesignation(contract, walletDesignation, { gasPrice });
    expect(logs).toEqual([
      {
        level: 'INFO',
        message: `Submitting wallet designation index:${walletDesignation.walletIndex} for Request:${walletDesignation.id}...`,
      },
    ]);
    expect(err).toEqual(null);
    expect(data).toEqual(null);
    expect(contract.fulfillWalletDesignation).toHaveBeenCalledTimes(1);
    expect(contract.fulfillWalletDesignation).toHaveBeenCalledWith(
      walletDesignation.id,
      walletDesignation.walletIndex,
      txOpts
    );
  });
});
