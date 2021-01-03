import { ethers } from 'ethers';
import { fetchPendingRequests } from './fetch-pending-requests';
import * as verification from '../verification';
import * as fixtures from 'test/fixtures';
import _ from 'lodash';

export const orDie = (arg) => {
  if (_.isNil(arg)) throw new Error(`Argument is empty`);
  return arg;
};

export const unfreezeImport = <T>(module: T, key: keyof T): void => {
  const meta = orDie(Object.getOwnPropertyDescriptor(module, key));
  const getter = orDie(meta.get);

  const originalValue = getter() as T[typeof key];
  let currentValue = originalValue;
  let isMocked = false;

  Object.defineProperty(module, key, {
    ...meta,
    get: () => (isMocked ? currentValue : getter()),
    set(newValue: T[typeof key]) {
      isMocked = newValue !== originalValue;
      currentValue = newValue;
    },
  });
};

unfreezeImport(verification, 'verifyApiCallIds');

describe('fetchPendingRequests', () => {
  it('maps and groups requests', async () => {
    const fullRequest = fixtures.evm.buildFullClientRequest();
    const withdrawal = fixtures.evm.buildWithdrawalRequest();
    const getLogsSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
    getLogsSpy.mockResolvedValueOnce([fullRequest, withdrawal]);
    const state = fixtures.buildEVMProviderState();
    const res = await fetchPendingRequests(state);
    expect(getLogsSpy).toHaveBeenCalledTimes(1);
    expect(res).toEqual({
      apiCalls: [
        {
          clientAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
          designatedWallet: '0x3580C27eDAafdb494973410B794f3F07fFAEa5E5',
          encodedParameters: '0x3100000000000000000000000000000000000000000000000000000000000000',
          endpointId: '0xac2e948e29db14b568a3cbaeedc66c0f9b5c5312f6b562784889e8cbd6a6dd9e',
          fulfillAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
          fulfillFunctionId: '0xd3bd1464',
          id: '0x8f9e20ade8c24c22c8ce9a4eb074f8c3f40c6f42982e46f8625c21677b3e0be6',
          metadata: {
            blockNumber: 17,
            currentBlock: null,
            ignoreBlockedRequestsAfterBlocks: 20,
            transactionHash: '0xfed5526187a54b842da904873cb15e9f6926504a1a3e3352b07f5b108d7405cd',
          },
          parameters: {},
          providerId: '0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9',
          requestCount: '2',
          requesterIndex: '2',
          status: 'Pending',
          templateId: null,
          type: 'full',
        },
      ],
      withdrawals: [
        {
          designatedWallet: '0xeadFE69e7D9E1d369D05DF6a88F687129523e16d',
          destinationAddress: '0x2c826Eb4C68386BCe3389D1782F6e41825B654fC',
          id: '0x5104cbd15362576f8591d30ab8a9bf7cd46359da50888732394444660717f124',
          metadata: {
            blockNumber: 15,
            currentBlock: null,
            ignoreBlockedRequestsAfterBlocks: 20,
            transactionHash: '0x19ad53f44d5d12302f351ac3a57dc27fb94b09e33d0e215e4be42ade3c2e0367',
          },
          providerId: '0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9',
          requesterIndex: '1',
          status: 'Pending',
        },
      ],
    });
  });

  it('verifies API calls', async () => {
    const fullRequest = fixtures.evm.buildFullClientRequest();
    const getLogsSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
    getLogsSpy.mockResolvedValueOnce([fullRequest]);
    const verificationSpy = jest.spyOn(verification, 'verifyApiCallIds');
    const state = fixtures.buildEVMProviderState();
    await fetchPendingRequests(state);
    expect(verificationSpy).toHaveBeenCalledTimes(1);
    expect(verificationSpy).toHaveBeenCalledWith([
      {
        clientAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        designatedWallet: '0x3580C27eDAafdb494973410B794f3F07fFAEa5E5',
        encodedParameters: '0x3100000000000000000000000000000000000000000000000000000000000000',
        endpointId: '0xac2e948e29db14b568a3cbaeedc66c0f9b5c5312f6b562784889e8cbd6a6dd9e',
        fulfillAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        fulfillFunctionId: '0xd3bd1464',
        id: '0x8f9e20ade8c24c22c8ce9a4eb074f8c3f40c6f42982e46f8625c21677b3e0be6',
        metadata: {
          blockNumber: 17,
          currentBlock: null,
          ignoreBlockedRequestsAfterBlocks: 20,
          transactionHash: '0xfed5526187a54b842da904873cb15e9f6926504a1a3e3352b07f5b108d7405cd',
        },
        parameters: {},
        providerId: '0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9',
        requestCount: '2',
        requesterIndex: '2',
        status: 'Pending',
        templateId: null,
        type: 'full',
      },
    ]);
  });
});
