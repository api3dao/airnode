import { ethers } from 'ethers';
import { fetchPendingRequests } from './fetch-pending-requests';
import * as blocking from '../requests/blocking';
import * as verification from '../verification';
import { unfreezeImport } from '../../../test/helpers';
import * as fixtures from '../../../test/fixtures';

unfreezeImport(verification, 'verifyApiCallIds');

describe('fetchPendingRequests', () => {
  it('maps and groups requests', async () => {
    const fullRequest = fixtures.evm.logs.buildMadeFullRequest();
    const withdrawal = fixtures.evm.logs.buildRequestedWithdrawal();
    const getLogsSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
    getLogsSpy.mockResolvedValueOnce([fullRequest, withdrawal]);
    const state = fixtures.buildEVMProviderState();
    const res = await fetchPendingRequests(state);
    expect(getLogsSpy).toHaveBeenCalledTimes(1);
    expect(res).toEqual({
      apiCalls: [
        {
          airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
          chainId: '31337',
          requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
          sponsorWallet: '0x3598aF73AAaCCf46A36e00490627029487D9730c',
          encodedParameters:
            '0x316262626262000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000746f00000000000000000000000000000000000000000000000000000000000055534400000000000000000000000000000000000000000000000000000000005f74797065000000000000000000000000000000000000000000000000000000696e7432353600000000000000000000000000000000000000000000000000005f70617468000000000000000000000000000000000000000000000000000000726573756c7400000000000000000000000000000000000000000000000000005f74696d657300000000000000000000000000000000000000000000000000003130303030300000000000000000000000000000000000000000000000000000',
          endpointId: '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353',
          fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
          fulfillFunctionId: '0x48a4157c',
          id: '0x50768a93cfd5bc21d45718f290be74ffd136aa3f27573c1bd48f70fd00884925',
          metadata: {
            blockNumber: 12,
            currentBlock: null,
            ignoreBlockedRequestsAfterBlocks: 20,
            transactionHash: '0x3512967ec5dc973c21a305e64633df62882bb69433227d1e22a66ba93f50ae14',
          },
          parameters: {
            _path: 'result',
            _times: '100000',
            _type: 'int256',
            from: 'ETH',
            to: 'USD',
          },
          requestCount: '2',
          sponsorAddress: '0x64b7d7c64A534086EfF591B73fcFa912feE74c69',
          status: 'Pending',
          templateId: null,
          type: 'full',
        },
      ],
      withdrawals: [
        {
          airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
          sponsorWallet: '0xCAcdedD1B7beDb689464E8EE4e73deF16BBB167D',
          id: '0xa7b1bd18101c48f0107eb63dafe548baa19024c7fe45884183df47234860f1d1',
          metadata: {
            blockNumber: 13,
            currentBlock: null,
            ignoreBlockedRequestsAfterBlocks: 20,
            transactionHash: '0x07231bb8ea269fc37714f1de27d43c4275a57e5f9bbf749d70db6f71230d95f6',
          },
          sponsorAddress: '0x0Ee8ade271eFadaBFeB9b1D45d924B6b623E25E7',
          status: 'Pending',
        },
      ],
    });
  });

  it('verifies API calls', async () => {
    const fullRequest = fixtures.evm.logs.buildMadeFullRequest();
    const getLogsSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
    getLogsSpy.mockResolvedValueOnce([fullRequest]);
    const verificationSpy = jest.spyOn(verification, 'verifyApiCallIds');
    const state = fixtures.buildEVMProviderState();
    await fetchPendingRequests(state);
    expect(verificationSpy).toHaveBeenCalledTimes(1);
  });

  it('blocks API calls linked to withdrawals', async () => {
    const fullRequest = fixtures.evm.logs.buildMadeFullRequest();
    const withdrawal = fixtures.evm.logs.buildMadeFullRequest();
    const getLogsSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
    getLogsSpy.mockResolvedValueOnce([fullRequest, withdrawal]);
    const blockingSpy = jest.spyOn(blocking, 'blockRequestsWithWithdrawals');
    const state = fixtures.buildEVMProviderState();
    await fetchPendingRequests(state);
    expect(blockingSpy).toHaveBeenCalledTimes(1);
  });
});
