import { ethers } from 'ethers';
import { fetchPendingRequests } from './fetch-pending-requests';
import * as blocking from '../requests/blocking';
import * as fixtures from '../../../test/fixtures';

describe('fetchPendingRequests', () => {
  fixtures.setEnvVariables({ AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey() });

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
            '0x317373737373000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000746f00000000000000000000000000000000000000000000000000000000000055534400000000000000000000000000000000000000000000000000000000005f74797065000000000000000000000000000000000000000000000000000000696e7432353600000000000000000000000000000000000000000000000000005f70617468000000000000000000000000000000000000000000000000000000726573756c7400000000000000000000000000000000000000000000000000005f74696d657300000000000000000000000000000000000000000000000000003130303030300000000000000000000000000000000000000000000000000000',
          endpointId: '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6',
          fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
          fulfillFunctionId: '0x7c1de7e1',
          id: '0x263c11afed6cff9933cc46487ce6b10cf36a795e4908724c09da9e1c16f43799',
          metadata: {
            address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
            blockNumber: 13,
            currentBlock: null,
            minConfirmations: 0,
            transactionHash: '0x420ebda3f246256ced7a58fb72d28d99548eb30de6d2e4d5c767fb547ff795ff',
            logIndex: 0,
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
          templateId: null,
          type: 'full',
        },
      ],
      withdrawals: [
        {
          airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
          chainId: '31337',
          sponsorWalletAddress: '0x1C1CEEF1a887eDeAB20219889971e1fd4645b55D',
          id: '0xcadc095f1dc6808a34d6166a72e3c3bb039fb401a5d90a270091aa1d25e4e342',
          metadata: {
            address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
            blockNumber: 14,
            currentBlock: null,
            minConfirmations: 0,
            transactionHash: '0xcc764cd8c569d23b8b2246c80ec8e2091772140e1aafe9e326dfe37cd73454c4',
            logIndex: 0,
          },
          sponsorAddress: '0x2479808b1216E998309A727df8A0A98A1130A162',
        },
      ],
    });
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
