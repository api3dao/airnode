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
import * as requesterDetails from './requester-data';
import * as providerState from '../../providers/state';
import { ApiCall, DirectRequest, ProviderState, RequestErrorCode } from '../../../types';

describe('fetch', () => {
  let state: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    state = providerState.create(config, 0);
  });

  it('makes a single Ethereum call for grouped unique requester addresses', async () => {
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

    const addresses = Array.from(Array(19).keys()).map((n) => n.toString());

    const res = await requesterDetails.fetch(state, addresses);

    expect(Object.keys(res).length).toEqual(19);
    expect(res['1']).toEqual({
      requesterId: '0xrequesterId',
      walletAddress: 'walletAddress',
      walletIndex: 1,
      walletBalance: ethers.BigNumber.from('15'),
      walletMinimumBalance: ethers.BigNumber.from('5'),
    });

    expect(getDataWithClientAddressesMock).toHaveBeenCalledTimes(2);
    expect(getDataWithClientAddressesMock.mock.calls).toEqual([
      [providerId, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']],
      [providerId, ['10', '11', '12', '13', '14', '15', '16', '17', '18']],
    ]);
  });

  it('filters out failed requests', async () => {
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

    const addresses = Array.from(Array(19).keys()).map((n) => n.toString());

    const res = await requesterDetails.fetch(state, addresses);
    expect(Object.keys(res).length).toEqual(10);
    expect(res['0']).toEqual({
      requesterId: '0xrequesterId',
      walletAddress: 'walletAddress',
      walletIndex: 1,
      walletBalance: ethers.BigNumber.from('15'),
      walletMinimumBalance: ethers.BigNumber.from('5'),
    });

    expect(getDataWithClientAddressesMock).toHaveBeenCalledTimes(3);
    expect(getDataWithClientAddressesMock.mock.calls).toEqual([
      [providerId, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']],
      [providerId, ['10', '11', '12', '13', '14', '15', '16', '17', '18']],
      [providerId, ['10', '11', '12', '13', '14', '15', '16', '17', '18']],
    ]);
  });
});

describe('apply', () => {
  let state: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    state = providerState.create(config, 0);
  });

  it('applies requester data to the API call request', () => {
    const apiCallRequest = createNewApiCallRequest({ id: '0x1', requesterAddress: '0xalice' });
    const requests = {
      apiCalls: [apiCallRequest],
      walletAuthorizations: [],
      withdrawals: [],
    };

    const dataByAddress = {
      '0xalice': {
        requesterId: 'aliceRequesterId',
        walletIndex: 1,
        walletAddress: 'aliceWalletAddress',
        walletBalance: ethers.BigNumber.from('15'),
        walletMinimumBalance: ethers.BigNumber.from('5'),
      },
    };

    const res = requesterDetails.apply(state, requests, dataByAddress);
    expect(Object.keys(res).sort()).toEqual(['apiCalls', 'walletAuthorizations', 'withdrawals']);

    expect(res.apiCalls.length).toEqual(1);
    expect(res.apiCalls[0]).toEqual({
      ...apiCallRequest,
      requesterId: 'aliceRequesterId',
      walletIndex: 1,
      walletAddress: 'aliceWalletAddress',
      walletBalance: ethers.BigNumber.from('15'),
      walletMinimumBalance: ethers.BigNumber.from('5'),
    });
  });

  it('invalidates requests that do not have any data', () => {
    const apiCallRequest = createNewApiCallRequest({ id: '0x1', requesterAddress: '0xalice' });
    const requests = {
      apiCalls: [apiCallRequest],
      walletAuthorizations: [],
      withdrawals: [],
    };

    const dataByAddress = {
      '0xbob': {
        requesterId: 'bobRequesterId',
        walletIndex: 1,
        walletAddress: 'bobWalletAddress',
        walletBalance: ethers.BigNumber.from('15'),
        walletMinimumBalance: ethers.BigNumber.from('5'),
      },
    };

    const res = requesterDetails.apply(state, requests, dataByAddress);

    expect(res.apiCalls.length).toEqual(1);
    expect(res.apiCalls[0]).toEqual({
      ...apiCallRequest,
      valid: false,
      errorCode: RequestErrorCode.RequesterDataNotFound,
      requesterId: '',
      walletIndex: -1,
      walletAddress: '',
      walletBalance: ethers.BigNumber.from('0'),
      walletMinimumBalance: ethers.BigNumber.from('0'),
    });
  });
});

function createNewApiCallRequest(params?: any): DirectRequest<ApiCall> {
  return {
    requestId: 'requestId',
    requesterId: 'requestId',
    requesterAddress: 'requesterAddress',
    endpointId: 'endpointId',
    templateId: null,
    fulfillAddress: 'fulfillAddress',
    fulfillFunctionId: 'fulfillFunctionId',
    errorAddress: 'errorAddress',
    errorFunctionId: 'errorFunctionId',
    encodedParameters: 'encodedParameters',
    parameters: { from: 'ETH' },
    valid: true,
    ...params,
  };
}
