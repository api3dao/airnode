const estimateGasWithdrawalMock = jest.fn();
const fulfillWithdrawalMock = jest.fn();
const getBalanceMock = jest.fn();
jest.mock('ethers', () => ({
  ethers: {
    ...jest.requireActual('ethers'),
    providers: {
      JsonRpcProvider: jest.fn().mockImplementation(() => ({
        getBalance: getBalanceMock,
      })),
    },
    Contract: jest.fn().mockImplementation(() => ({
      estimateGas: {
        fulfillWithdrawal: estimateGasWithdrawalMock,
      },
      fulfillWithdrawal: fulfillWithdrawalMock,
    })),
  },
}));

jest.mock('../../config', () => ({
  security: {
    masterKeyMnemonic: 'achieve climb couple wait accident symbol spy blouse reduce foil echo label',
  },
}));

import { ethers } from 'ethers';
import * as fixtures from 'test/fixtures';
import { RequestStatus } from 'src/types';
import * as withdrawals from './withdrawals';

describe('submitWithdrawal', () => {
  it('subtracts transaction costs and submits the remaining balance for pending requests', async () => {
    const contract = new ethers.Contract('address', ['ABI']);
    const provider = new ethers.providers.JsonRpcProvider();
    const options = { gasPrice: ethers.BigNumber.from(1000), provider };
    (provider.getBalance as jest.Mock).mockResolvedValueOnce(ethers.BigNumber.from(250_000_000));
    (contract.estimateGas.fulfillWithdrawal as jest.Mock).mockResolvedValueOnce(ethers.BigNumber.from(50_000));
    contract.fulfillWithdrawal.mockResolvedValueOnce({ hash: '0xsuccessful' });
    const gasPrice = ethers.BigNumber.from(1000);
    const withdrawal = fixtures.requests.createWithdrawal({ nonce: 5, status: RequestStatus.Pending });
    const [logs, err, data] = await withdrawals.submitWithdrawal(contract, withdrawal, options);
    expect(logs).toEqual([
      { level: 'DEBUG', message: `Withdrawal gas limit estimated at 70000 for Request:${withdrawal.id}` },
      {
        level: 'INFO',
        message: `Submitting withdrawal wallet index:${withdrawal.requesterIndex} for Request:${withdrawal.id}...`,
      },
    ]);
    expect(err).toEqual(null);
    expect(data).toEqual({ hash: '0xsuccessful' });
    expect(contract.fulfillWithdrawal).toHaveBeenCalledTimes(1);
    expect(contract.fulfillWithdrawal).toHaveBeenCalledWith(
      withdrawal.id,
      withdrawal.providerId,
      withdrawal.requesterIndex,
      withdrawal.destinationAddress,
      {
        gasPrice,
        gasLimit: ethers.BigNumber.from(70_000),
        nonce: 5,
        // 250_000_000 - ((50_000 + 20_000) * 1000)
        value: ethers.BigNumber.from(180_000_000),
      }
    );
  });

  it('does nothing if the request is already fulfilled', async () => {
    const contract = new ethers.Contract('address', ['ABI']);
    const gasPrice = ethers.BigNumber.from('1000');
    const withdrawal = fixtures.requests.createWithdrawal({ nonce: 5, status: RequestStatus.Fulfilled });
    const [logs, err, data] = await withdrawals.submitWithdrawal(contract, withdrawal, { gasPrice });
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message: `Withdrawal wallet index:${withdrawal.requesterIndex} for Request:${withdrawal.id} not actioned as it has status:${withdrawal.status}`,
      },
    ]);
    expect(err).toEqual(null);
    expect(data).toEqual(null);
    expect(contract.fulfillWithdrawal).not.toHaveBeenCalled();
  });

  it('does nothing if the request is blocked or errored', async () => {
    const contract = new ethers.Contract('address', ['ABI']);
    const gasPrice = ethers.BigNumber.from(1000);
    // NOTE: a withdrawal should not be able to become "errored" or "blocked", but this
    // is just in case that changes
    const blocked = fixtures.requests.createWithdrawal({ status: RequestStatus.Blocked });
    const errored = fixtures.requests.createWithdrawal({ status: RequestStatus.Errored });

    const blockedRes = await withdrawals.submitWithdrawal(contract, blocked, { gasPrice });
    const erroredRes = await withdrawals.submitWithdrawal(contract, errored, { gasPrice });

    expect(blockedRes[0]).toEqual([
      {
        level: 'INFO',
        message: `Withdrawal wallet index:${blocked.requesterIndex} for Request:${blocked.id} not actioned as it has status:${blocked.status}`,
      },
    ]);
    expect(blockedRes[1]).toEqual(null);
    expect(blockedRes[2]).toEqual(null);
    expect(erroredRes[0]).toEqual([
      {
        level: 'INFO',
        message: `Withdrawal wallet index:${errored.requesterIndex} for Request:${errored.id} not actioned as it has status:${errored.status}`,
      },
    ]);
    expect(erroredRes[1]).toEqual(null);
    expect(erroredRes[2]).toEqual(null);
    expect(contract.fulfillWithdrawal).not.toHaveBeenCalled();
  });

  it('does nothing if the withdrawal amount would be negative', async () => {
    const contract = new ethers.Contract('address', ['ABI']);
    const provider = new ethers.providers.JsonRpcProvider();
    const options = { gasPrice: ethers.BigNumber.from(1000), provider };
    (provider.getBalance as jest.Mock).mockResolvedValueOnce(ethers.BigNumber.from(50_000_000));
    (contract.estimateGas.fulfillWithdrawal as jest.Mock).mockResolvedValueOnce(ethers.BigNumber.from(50_000));
    const withdrawal = fixtures.requests.createWithdrawal({ nonce: 5, status: RequestStatus.Pending });
    const [logs, err, data] = await withdrawals.submitWithdrawal(contract, withdrawal, options);
    expect(logs).toEqual([
      { level: 'DEBUG', message: `Withdrawal gas limit estimated at 70000 for Request:${withdrawal.id}` },
      {
        level: 'INFO',
        message: `Unable to submit negative withdrawal amount for Request:withdrawalId. Amount: -0.00000000002 ETH`,
      },
    ]);
    expect(err).toEqual(null);
    expect(data).toEqual(null);
    expect(contract.fulfillWithdrawal).not.toHaveBeenCalled();
  });

  it('returns an error if the current balance cannot be fetched', async () => {
    const contract = new ethers.Contract('address', ['ABI']);
    const provider = new ethers.providers.JsonRpcProvider();
    (provider.getBalance as jest.Mock).mockRejectedValueOnce(new Error('Could not fetch balance'));
    const options = { gasPrice: ethers.BigNumber.from(1000), provider };
    const withdrawal = fixtures.requests.createWithdrawal({ nonce: 5, status: RequestStatus.Pending });
    const [logs, err, data] = await withdrawals.submitWithdrawal(contract, withdrawal, options);
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: `Failed to fetch wallet index:${withdrawal.requesterIndex} balance for Request:${withdrawal.id}`,
        error: new Error('Could not fetch balance'),
      },
    ]);
    expect(err).toEqual(new Error('Could not fetch balance'));
    expect(data).toEqual(null);
    expect(contract.fulfillWithdrawal).not.toHaveBeenCalled();
  });

  it('returns an error if the estimate gas limit call fails', async () => {
    const contract = new ethers.Contract('address', ['ABI']);
    const provider = new ethers.providers.JsonRpcProvider();
    const options = { gasPrice: ethers.BigNumber.from(1000), provider };
    (provider.getBalance as jest.Mock).mockResolvedValueOnce(ethers.BigNumber.from(250_000_000));
    (contract.estimateGas.fulfillWithdrawal as jest.Mock).mockRejectedValueOnce(new Error('Server did not respond'));
    const withdrawal = fixtures.requests.createWithdrawal({ nonce: 5, status: RequestStatus.Pending });
    const [logs, err, data] = await withdrawals.submitWithdrawal(contract, withdrawal, options);
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: `Error estimating withdrawal gas limit for Request:${withdrawal.id}`,
        error: new Error('Server did not respond'),
      },
    ]);
    expect(err).toEqual(new Error('Server did not respond'));
    expect(data).toEqual(null);
    expect(contract.fulfillWithdrawal).not.toHaveBeenCalled();
  });

  it('returns an error if the withdrawal fails to submit', async () => {
    const contract = new ethers.Contract('address', ['ABI']);
    const provider = new ethers.providers.JsonRpcProvider();
    const options = { gasPrice: ethers.BigNumber.from(1000), provider };
    (provider.getBalance as jest.Mock).mockResolvedValueOnce(ethers.BigNumber.from(250_000_000));
    (contract.estimateGas.fulfillWithdrawal as jest.Mock).mockResolvedValueOnce(ethers.BigNumber.from(50_000));
    contract.fulfillWithdrawal.mockRejectedValueOnce(new Error('Could not submit withdrawal'));
    const gasPrice = ethers.BigNumber.from(1000);
    const withdrawal = fixtures.requests.createWithdrawal({ nonce: 5, status: RequestStatus.Pending });
    const [logs, err, data] = await withdrawals.submitWithdrawal(contract, withdrawal, options);
    expect(logs).toEqual([
      { level: 'DEBUG', message: `Withdrawal gas limit estimated at 70000 for Request:${withdrawal.id}` },
      {
        level: 'INFO',
        message: `Submitting withdrawal wallet index:${withdrawal.requesterIndex} for Request:${withdrawal.id}...`,
      },
      {
        level: 'ERROR',
        message: `Error submitting wallet index:${withdrawal.requesterIndex} withdrawal for Request:${withdrawal.id}`,
        error: new Error('Could not submit withdrawal'),
      },
    ]);
    expect(err).toEqual(new Error('Could not submit withdrawal'));
    expect(data).toEqual(null);
    expect(contract.fulfillWithdrawal).toHaveBeenCalledTimes(1);
    expect(contract.fulfillWithdrawal).toHaveBeenCalledWith(
      withdrawal.id,
      withdrawal.providerId,
      withdrawal.requesterIndex,
      withdrawal.destinationAddress,
      {
        gasPrice,
        gasLimit: ethers.BigNumber.from(70_000),
        nonce: 5,
        // 250_000_000 - ((50_000 + 20_000) * 1000)
        value: ethers.BigNumber.from(180_000_000),
      }
    );
  });
});
