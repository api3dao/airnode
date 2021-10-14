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
          sponsorWalletAddress: '0x654B6d01E1A03eeF91F50D79203Ace648be81350',
          encodedParameters:
            '0x316262626262000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000746f00000000000000000000000000000000000000000000000000000000000055534400000000000000000000000000000000000000000000000000000000005f74797065000000000000000000000000000000000000000000000000000000696e7432353600000000000000000000000000000000000000000000000000005f70617468000000000000000000000000000000000000000000000000000000726573756c7400000000000000000000000000000000000000000000000000005f74696d657300000000000000000000000000000000000000000000000000003130303030300000000000000000000000000000000000000000000000000000',
          endpointId: '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353',
          fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
          fulfillFunctionId: '0x7c1de7e1',
          id: '0x3bf7126540ba52d57766f73aad65c7265c44b4adb622a724f0676225a5b9cdb5',
          metadata: {
            address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
            blockNumber: 12,
            currentBlock: null,
            ignoreBlockedRequestsAfterBlocks: 20,
            transactionHash: '0x0ba1b3c4b6710fffeb6c2d1e62f11fa695177a456e4e895f0666ec54b2e7f8bf',
          },
          parameters: {
            _path: 'result',
            _times: '100000',
            _type: 'int256',
            from: 'ETH',
            to: 'USD',
          },
          requestCount: '2',
          sponsorAddress: '0x61648B2Ec3e6b3492E90184Ef281C2ba28a675ec',
          status: 'Pending',
          templateId: null,
          type: 'full',
        },
      ],
      withdrawals: [
        {
          airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
          sponsorWalletAddress: '0xB3806eb17832fc796247037EFe6d6079909b2192',
          id: '0x0dd22fb3710966e310910c895c5291f6ce27cf4742ad5565f9cf61fc50893907',
          metadata: {
            address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
            blockNumber: 13,
            currentBlock: null,
            ignoreBlockedRequestsAfterBlocks: 20,
            transactionHash: '0x786e3f9a5ee19f103e3a4999e82684a5e6de2d3f5394f8dc36725c93a8a039b0',
          },
          sponsorAddress: '0x2479808b1216E998309A727df8A0A98A1130A162',
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
