import { ethers } from 'ethers';
import { fetchPendingRequests } from './fetch-pending-requests';
import * as blocking from '../requests/blocking';
import * as fixtures from '../../../test/fixtures';

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
          sponsorWalletAddress: '0x91Fa5bf7FE3cF2a8970B031b1EB6f824fFe228BE',
          encodedParameters:
            '0x316262626262000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000746f00000000000000000000000000000000000000000000000000000000000055534400000000000000000000000000000000000000000000000000000000005f74797065000000000000000000000000000000000000000000000000000000696e7432353600000000000000000000000000000000000000000000000000005f70617468000000000000000000000000000000000000000000000000000000726573756c7400000000000000000000000000000000000000000000000000005f74696d657300000000000000000000000000000000000000000000000000003130303030300000000000000000000000000000000000000000000000000000',
          endpointId: '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6',
          fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
          fulfillFunctionId: '0x7c1de7e1',
          id: '0x8d6d6ce1ac5020c4db26c34ae42fa8318a51fa21faef9a65663724641b369e63',
          metadata: {
            address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
            blockNumber: 13,
            currentBlock: null,
            ignoreBlockedRequestsAfterBlocks: 20,
            transactionHash:
              '0xba69a4584ca8e383412741f9f75b351d34d5eff9e14b38d8ba8b994bb175e3c5549594040952fc82817cbfb3eaf4593aa8858a34b682886737aac15f759dc1d41c',
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
          sponsorWalletAddress: '0x1C1CEEF1a887eDeAB20219889971e1fd4645b55D',
          id: '0xcadc095f1dc6808a34d6166a72e3c3bb039fb401a5d90a270091aa1d25e4e342',
          metadata: {
            address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
            blockNumber: 14,
            currentBlock: null,
            ignoreBlockedRequestsAfterBlocks: 20,
            transactionHash: '0xcc764cd8c569d23b8b2246c80ec8e2091772140e1aafe9e326dfe37cd73454c4',
          },
          sponsorAddress: '0x2479808b1216E998309A727df8A0A98A1130A162',
          status: 'Pending',
        },
      ],
    });
  });

  it('blocks API calls linked to withdrawals', async () => {
    const fullRequest = fixtures.evm.logs.buildMadeFullRequest();
    const withdrawal = fixtures.evm.logs.buildMadeFullRequest();
    const getLogsSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
    getLogsSpy.mockResolvedValueOnce([fullRequest, withdrawal]);
    const blockingSpy = jest.spyOn(blocking, 'blockRequests');
    const state = fixtures.buildEVMProviderState();
    await fetchPendingRequests(state);
    expect(blockingSpy).toHaveBeenCalledTimes(1);
  });
});
