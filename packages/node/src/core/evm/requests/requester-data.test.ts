const getDataWithClientAddressesMock = jest.fn();
jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ethers: {
      ...original,
      Contract: jest.fn().mockImplementation(() => ({
        getDataWithClientAddresses: getDataWithClientAddressesMock,
      })),
    },
  };
});

const providerId = '0xdf6677e5e84719a54ed715e7b341becf4e9afda7478baa89b5c6f449ff2b7259';
jest.mock('../../config', () => ({
  config: {
    nodeSettings: {
      providerId,
    },
  },
}));

import { ethers } from 'ethers';
import * as fixtures from 'test/fixtures';
import * as requesterDetails from './requester-data';
import { GroupedBaseRequests, RequestErrorCode, RequestStatus } from 'src/types';

describe('requester data - fetch', () => {
  it('makes a single Ethereum call for grouped unique requester addresses', async () => {
    const provider = new ethers.providers.JsonRpcProvider();
    const data1 = {
      requesterIds: Array(10).fill('0xrequesterId'),
      walletAddresses: Array(10).fill('walletAddress'),
      walletInds: Array(10).fill(1),
      walletBalances: Array(10).fill(ethers.BigNumber.from('15')),
      minBalances: Array(10).fill(ethers.BigNumber.from('5')),
    };
    const data2 = {
      requesterIds: Array(10).fill('0xrequesterId'),
      walletAddresses: Array(10).fill('walletAddress'),
      walletInds: Array(10).fill(2),
      walletBalances: Array(10).fill(ethers.BigNumber.from('23')),
      minBalances: Array(10).fill(ethers.BigNumber.from('6')),
    };

    getDataWithClientAddressesMock.mockResolvedValueOnce(data1);
    getDataWithClientAddressesMock.mockResolvedValueOnce(data2);

    const apiCalls = Array.from(Array(19).keys()).map((n) =>
      fixtures.requests.createBaseApiCall({ id: `0x${n}`, requesterAddress: `${n}` })
    );
    const groupedBaseRequests: GroupedBaseRequests = { apiCalls, walletDesignations: [], withdrawals: [] };

    const fetchOptions = { address: '0xD5659F26A72A8D718d1955C42B3AE418edB001e0', provider };
    const [logs, err, res] = await requesterDetails.fetch(fetchOptions, groupedBaseRequests);

    expect(logs).toEqual([]);
    expect(err).toEqual(null);

    expect(Object.keys(res).length).toEqual(19);
    expect(res['0']).toEqual({
      requesterId: '0xrequesterId',
      walletAddress: 'walletAddress',
      walletIndex: '1',
      walletBalance: '15',
      walletMinimumBalance: '5',
    });

    expect(getDataWithClientAddressesMock).toHaveBeenCalledTimes(2);
    expect(getDataWithClientAddressesMock.mock.calls).toEqual([
      [providerId, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']],
      [providerId, ['10', '11', '12', '13', '14', '15', '16', '17', '18']],
    ]);
  });

  it('retries once and filters out failed requests', async () => {
    const provider = new ethers.providers.JsonRpcProvider();
    const data = {
      requesterIds: Array(10).fill('0xrequesterId'),
      walletAddresses: Array(10).fill('walletAddress'),
      walletInds: Array(10).fill(1),
      walletBalances: Array(10).fill(ethers.BigNumber.from('15')),
      minBalances: Array(10).fill(ethers.BigNumber.from('5')),
    };

    getDataWithClientAddressesMock.mockResolvedValueOnce(data);
    getDataWithClientAddressesMock.mockRejectedValueOnce(new Error('Server says no'));
    getDataWithClientAddressesMock.mockRejectedValueOnce(new Error('Server says no'));

    const apiCalls = Array.from(Array(19).keys()).map((n) =>
      fixtures.requests.createBaseApiCall({ id: `0x${n}`, requesterAddress: `${n}` })
    );
    const groupedBaseRequests: GroupedBaseRequests = { apiCalls, walletDesignations: [], withdrawals: [] };

    const fetchOptions = { address: '0xD5659F26A72A8D718d1955C42B3AE418edB001e0', provider };
    const [logs, err, res] = await requesterDetails.fetch(fetchOptions, groupedBaseRequests);

    expect(logs).toEqual([
      { level: 'ERROR', message: 'Failed to fetch requester details', error: new Error('Server says no') },
    ]);
    expect(err).toEqual(null);
    expect(Object.keys(res).length).toEqual(10);
    expect(res['0']).toEqual({
      requesterId: '0xrequesterId',
      walletAddress: 'walletAddress',
      walletIndex: '1',
      walletBalance: '15',
      walletMinimumBalance: '5',
    });

    expect(getDataWithClientAddressesMock).toHaveBeenCalledTimes(3);
    expect(getDataWithClientAddressesMock.mock.calls).toEqual([
      [providerId, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']],
      [providerId, ['10', '11', '12', '13', '14', '15', '16', '17', '18']],
      [providerId, ['10', '11', '12', '13', '14', '15', '16', '17', '18']],
    ]);
  });

  it('retries a maximum of 2 times', async () => {
    const provider = new ethers.providers.JsonRpcProvider();
    getDataWithClientAddressesMock.mockRejectedValueOnce(new Error('Server says no'));
    getDataWithClientAddressesMock.mockRejectedValueOnce(new Error('Server says no'));

    const groupedBaseRequests: GroupedBaseRequests = {
      apiCalls: [fixtures.requests.createBaseApiCall()],
      walletDesignations: [],
      withdrawals: [],
    };

    const fetchOptions = { address: '0xD5659F26A72A8D718d1955C42B3AE418edB001e0', provider };
    const [logs, err, res] = await requesterDetails.fetch(fetchOptions, groupedBaseRequests);

    expect(logs).toEqual([
      { level: 'ERROR', message: 'Failed to fetch requester details', error: new Error('Server says no') },
    ]);
    expect(err).toEqual(null);
    expect(res).toEqual({});

    expect(getDataWithClientAddressesMock).toHaveBeenCalledTimes(2);
    expect(getDataWithClientAddressesMock.mock.calls).toEqual([
      [providerId, ['requesterAddress']],
      [providerId, ['requesterAddress']],
    ]);
  });
});

describe('requester data - apply', () => {
  it('applies requester data to API calls', () => {
    const apiCall = fixtures.requests.createBaseApiCall({ id: '0x1', requesterAddress: '0xalice' });
    const requests = {
      apiCalls: [apiCall],
      walletDesignations: [],
      withdrawals: [],
    };
    const dataByAddress = {
      '0xalice': {
        requesterId: 'aliceRequesterId',
        walletIndex: '1',
        walletAddress: 'aliceWalletAddress',
        walletBalance: '150000',
        walletMinimumBalance: '50000',
      },
    };
    const [logs, err, res] = requesterDetails.apply(requests, dataByAddress);
    expect(logs).toEqual([]);
    expect(err).toEqual(null);
    expect(Object.keys(res).sort()).toEqual(['apiCalls', 'walletDesignations', 'withdrawals']);
    expect(res.apiCalls.length).toEqual(1);
    expect(res.apiCalls[0]).toEqual({
      ...apiCall,
      requesterId: 'aliceRequesterId',
      walletIndex: '1',
      walletAddress: 'aliceWalletAddress',
      walletBalance: '150000',
      walletMinimumBalance: '50000',
    });
  });

  it('applies requester data to withdrawals', () => {
    const withdrawal = fixtures.requests.createBaseWithdrawal({ id: '0x1', destinationAddress: '0xalice' });
    const requests = {
      apiCalls: [],
      walletDesignations: [],
      withdrawals: [withdrawal],
    };
    const dataByAddress = {
      '0xalice': {
        requesterId: 'aliceRequesterId',
        walletIndex: '1',
        walletAddress: 'aliceWalletAddress',
        walletBalance: '150000',
        walletMinimumBalance: '50000',
      },
    };
    const [logs, err, res] = requesterDetails.apply(requests, dataByAddress);
    expect(logs).toEqual([]);
    expect(err).toEqual(null);
    expect(Object.keys(res).sort()).toEqual(['apiCalls', 'walletDesignations', 'withdrawals']);
    expect(res.withdrawals.length).toEqual(1);
    expect(res.withdrawals[0]).toEqual({
      ...withdrawal,
      requesterId: 'aliceRequesterId',
      walletIndex: '1',
      walletAddress: 'aliceWalletAddress',
      walletBalance: '150000',
      walletMinimumBalance: '50000',
    });
  });

  it('invalidates requests that do not have any data', () => {
    const apiCall = fixtures.requests.createApiCall({ requesterAddress: '0xalice' });
    const withdrawal = fixtures.requests.createBaseWithdrawal({ destinationAddress: '0xbob' });
    const requests = {
      apiCalls: [apiCall],
      walletDesignations: [],
      withdrawals: [withdrawal],
    };
    const dataByAddress = {
      '0xcharles': {
        requesterId: 'charlesRequesterId',
        walletIndex: '1',
        walletAddress: 'charlesWalletAddress',
        walletBalance: '150000',
        walletMinimumBalance: '50000',
      },
    };
    const [logs, err, res] = requesterDetails.apply(requests, dataByAddress);
    expect(logs).toEqual([
      { level: 'ERROR', message: `Unable to find requester data for Request ID:${apiCall.id}` },
      { level: 'ERROR', message: `Unable to find requester data for Request ID:${withdrawal.id}` },
    ]);
    expect(err).toEqual(null);
    expect(res.apiCalls.length).toEqual(1);
    expect(res.apiCalls[0]).toEqual({
      ...apiCall,
      status: RequestStatus.Blocked,
      errorCode: RequestErrorCode.RequesterDataNotFound,
      requesterId: '',
      walletIndex: '-1',
      walletAddress: '',
      walletBalance: '0',
      walletMinimumBalance: '0',
    });
    expect(res.withdrawals.length).toEqual(1);
    expect(res.withdrawals[0]).toEqual({
      ...withdrawal,
      status: RequestStatus.Blocked,
      errorCode: RequestErrorCode.RequesterDataNotFound,
      requesterId: '',
      walletIndex: '-1',
      walletAddress: '',
      walletBalance: '0',
      walletMinimumBalance: '0',
    });
  });
});
