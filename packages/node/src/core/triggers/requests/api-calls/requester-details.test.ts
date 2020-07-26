const getDataWithClientAddressMock = jest.fn();
jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ethers: {
      ...original,
      Contract: jest.fn().mockImplementation(() => ({
        getDataWithClientAddress: getDataWithClientAddressMock,
      })),
    },
  };
});

const providerId = '0xdf6677e5e84719a54ed715e7b341becf4e9afda7478baa89b5c6f449ff2b7259';
jest.mock('../../../config', () => ({
  config: {
    nodeSettings: {
      providerId,
    },
  },
}));

import { ethers } from 'ethers';
import * as requesterDetails from './requester-details';
import * as providerState from '../../../providers/state';
import { ApiCallRequest, ProviderState } from '../../../../types';

describe('fetch', () => {
  let state: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    state = providerState.create(config, 0);
  });

  it('ignores invalid requests', async () => {
    const invalidRequest = createNewApiCallRequest({ valid: false });
    const res = await requesterDetails.fetch(state, [invalidRequest]);
    expect(res).toEqual([]);
    expect(getDataWithClientAddressMock).not.toHaveBeenCalled();
  });

  it('makes a single Ethereum call for each unique requester address', async () => {
    const aliceRequest = createNewApiCallRequest({ requesterAddress: '0xalice' });
    const bobRequest1 = createNewApiCallRequest({ requesterAddress: '0xbob' });
    const bobRequest2 = createNewApiCallRequest({ requesterAddress: '0xbob' });

    const aliceData = { walletIndex: 1 };
    const bobData = { walletIndex: 2 };
    getDataWithClientAddressMock.mockResolvedValueOnce(aliceData);
    getDataWithClientAddressMock.mockResolvedValueOnce(bobData);

    const res = await requesterDetails.fetch(state, [aliceRequest, bobRequest1, bobRequest2]);
    expect(res).toEqual([
      { requesterAddress: '0xalice', data: aliceData },
      { requesterAddress: '0xbob', data: bobData },
    ]);

    expect(getDataWithClientAddressMock).toHaveBeenCalledTimes(2);
    expect(getDataWithClientAddressMock.mock.calls).toEqual([
      [providerId, '0xalice'],
      [providerId, '0xbob'],
    ]);
  });

  it('filters out failed requests', async () => {
    const aliceRequest = createNewApiCallRequest({ requesterAddress: '0xalice' });
    const frankRequest = createNewApiCallRequest({ requesterAddress: '0xfrank' });

    const aliceData = { walletIndex: 1 };
    getDataWithClientAddressMock.mockResolvedValueOnce(aliceData);
    getDataWithClientAddressMock.mockRejectedValueOnce(new Error('Server says no'));
    getDataWithClientAddressMock.mockRejectedValueOnce(new Error('Server says no'));

    const res = await requesterDetails.fetch(state, [aliceRequest, frankRequest]);
    expect(res).toEqual([{ requesterAddress: '0xalice', data: aliceData }]);

    expect(getDataWithClientAddressMock).toHaveBeenCalledTimes(3);
    expect(getDataWithClientAddressMock.mock.calls).toEqual([
      [providerId, '0xalice'],
      [providerId, '0xfrank'],
      [providerId, '0xfrank'],
    ]);
  });
});

describe('apply', () => {
  it('applies requester data to the API call request', () => {
    const aliceRequest = createNewApiCallRequest({ requestId: '0x1', requesterAddress: '0xalice' });
    const bobRequest1 = createNewApiCallRequest({ requestId: '0x2', requesterAddress: '0xbob' });
    const bobRequest2 = createNewApiCallRequest({ requestId: '0x3', requesterAddress: '0xbob' });

    const aliceData = {
      requesterAddress: '0xalice',
      data: {
        requesterId: 'aliceRequesterId',
        walletIndex: 1,
        walletAddress: 'aliceWalletAddress',
        walletBalance: ethers.BigNumber.from('15'),
        walletMinimumBalance: ethers.BigNumber.from('5'),
      },
    };

    const bobData = {
      requesterAddress: '0xbob',
      data: {
        requesterId: 'bobRequesterId',
        walletIndex: 2,
        walletAddress: 'bobWalletAddress',
        walletBalance: ethers.BigNumber.from('30'),
        walletMinimumBalance: ethers.BigNumber.from('6'),
      },
    };

    const res = requesterDetails.apply([aliceRequest, bobRequest1, bobRequest2], [bobData, aliceData]);
    expect(res.length).toEqual(3);

    const aliceFullRequest = res.find((r) => r.requestId === '0x1');
    expect(aliceFullRequest).toEqual({
      ...aliceRequest,
      requesterId: 'aliceRequesterId',
      walletIndex: 1,
      walletAddress: 'aliceWalletAddress',
      walletBalance: ethers.BigNumber.from('15'),
      walletMinimumBalance: ethers.BigNumber.from('5'),
    });

    const bobFullRequest1 = res.find((r) => r.requestId === '0x2');
    expect(bobFullRequest1).toEqual({
      ...bobRequest1,
      requesterId: 'bobRequesterId',
      walletIndex: 2,
      walletAddress: 'bobWalletAddress',
      walletBalance: ethers.BigNumber.from('30'),
      walletMinimumBalance: ethers.BigNumber.from('6'),
    });

    const bobFullRequest2 = res.find((r) => r.requestId === '0x3');
    expect(bobFullRequest2).toEqual({
      ...bobRequest2,
      requesterId: 'bobRequesterId',
      walletIndex: 2,
      walletAddress: 'bobWalletAddress',
      walletBalance: ethers.BigNumber.from('30'),
      walletMinimumBalance: ethers.BigNumber.from('6'),
    });
  });
});

function createNewApiCallRequest(params?: any): ApiCallRequest {
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
