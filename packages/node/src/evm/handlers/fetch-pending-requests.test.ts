import { ethers } from 'ethers';
import { fetchPendingRequests } from './fetch-pending-requests';
import * as blocking from '../requests/blocking';
import * as verification from '../verification';
import { unfreezeImport } from '../../../test/helpers';
import * as fixtures from 'test/fixtures';

unfreezeImport(verification, 'verifyApiCallIds');

describe('fetchPendingRequests', () => {
  it('maps and groups requests', async () => {
    const fullRequest = fixtures.evm.logs.buildFullClientRequest();
    const withdrawal = fixtures.evm.logs.buildWithdrawalRequest();
    const getLogsSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
    getLogsSpy.mockResolvedValueOnce([fullRequest, withdrawal]);
    const state = fixtures.buildEVMProviderState();
    const res = await fetchPendingRequests(state);
    expect(getLogsSpy).toHaveBeenCalledTimes(1);
    expect(res).toEqual({
      apiCalls: [
        {
          clientAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
          designatedWallet: '0xa46c4b41d72Ada9D14157b28A8a2Db97560fFF12',
          encodedParameters:
            '0x316262626262000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000746f00000000000000000000000000000000000000000000000000000000000055534400000000000000000000000000000000000000000000000000000000005f74797065000000000000000000000000000000000000000000000000000000696e7432353600000000000000000000000000000000000000000000000000005f70617468000000000000000000000000000000000000000000000000000000726573756c7400000000000000000000000000000000000000000000000000005f74696d657300000000000000000000000000000000000000000000000000003130303030300000000000000000000000000000000000000000000000000000',
          endpointId: '0xac2e948e29db14b568a3cbaeedc66c0f9b5c5312f6b562784889e8cbd6a6dd9e',
          fulfillAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
          fulfillFunctionId: '0xd3bd1464',
          id: '0x578fa33a394513a25153153767e7c8ef8ac4af8599c8620b555c6ac99984a7e7',
          metadata: {
            blockNumber: 17,
            currentBlock: null,
            ignoreBlockedRequestsAfterBlocks: 20,
            transactionHash: '0xed554fbbb2971fb2af7f5c800b586de239d806a31785252eb957ac1a9cf72468',
          },
          parameters: {
            _path: 'result',
            _times: '100000',
            _type: 'int256',
            from: 'ETH',
            to: 'USD',
          },
          providerId: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
          requestCount: '2',
          requesterIndex: '2',
          status: 'Pending',
          templateId: null,
          type: 'full',
        },
      ],
      withdrawals: [
        {
          designatedWallet: '0x34e9A78D63c9ca2148C95e880c6B1F48AE7F121E',
          destinationAddress: '0x364160Ca5E2d5A0A81A71C999787A09e4C8ae2Dd',
          id: '0x5104cbd15362576f8591d30ab8a9bf7cd46359da50888732394444660717f124',
          metadata: {
            blockNumber: 18,
            currentBlock: null,
            ignoreBlockedRequestsAfterBlocks: 20,
            transactionHash: '0xac3aa3683548a631dd7561cfa32d4e003f43bfc061bb40adc9920c9c1d4d6a60',
          },
          providerId: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
          requesterIndex: '1',
          status: 'Pending',
        },
      ],
    });
  });

  it('verifies API calls', async () => {
    const fullRequest = fixtures.evm.logs.buildFullClientRequest();
    const getLogsSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
    getLogsSpy.mockResolvedValueOnce([fullRequest]);
    const verificationSpy = jest.spyOn(verification, 'verifyApiCallIds');
    const state = fixtures.buildEVMProviderState();
    await fetchPendingRequests(state);
    expect(verificationSpy).toHaveBeenCalledTimes(1);
  });

  it('blocks API calls linked to withdrawals', async () => {
    const fullRequest = fixtures.evm.logs.buildFullClientRequest();
    const withdrawal = fixtures.evm.logs.buildFullClientRequest();
    const getLogsSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
    getLogsSpy.mockResolvedValueOnce([fullRequest, withdrawal]);
    const blockingSpy = jest.spyOn(blocking, 'blockRequestsWithWithdrawals');
    const state = fixtures.buildEVMProviderState();
    await fetchPendingRequests(state);
    expect(blockingSpy).toHaveBeenCalledTimes(1);
  });
});
