import { mockEthers } from '../../../test/mock-utils';
const checkAuthorizationStatusesMock = jest.fn();
const getTemplatesMock = jest.fn();
mockEthers({
  airnodeRrpMocks: {
    checkAuthorizationStatuses: checkAuthorizationStatusesMock,
    getTemplates: getTemplatesMock,
  },
});

import { ethers } from 'ethers';
import * as adapter from '@api3/airnode-adapter';
import { initializeProvider } from './initialize-provider';
import * as fixtures from '../../../test/fixtures';

describe('initializeProvider', () => {
  it('fetches, maps and authorizes requests', async () => {
    jest.setTimeout(30_000);
    const getBlockNumberSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBlockNumber');
    const currentBlockNumber = 18;
    getBlockNumberSpy.mockResolvedValueOnce(currentBlockNumber);

    const templateRequest = fixtures.evm.logs.buildMadeTemplateRequest();
    const fullRequest = fixtures.evm.logs.buildMadeFullRequest();
    const withdrawal = fixtures.evm.logs.buildRequestedWithdrawal();
    const getLogsSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
    getLogsSpy.mockResolvedValueOnce([templateRequest, fullRequest, withdrawal]);

    const executeSpy = jest.spyOn(adapter, 'buildAndExecuteRequest') as jest.SpyInstance;
    executeSpy.mockResolvedValue({
      data: { prices: ['443.76381', '441.83723'] },
      status: 200,
    });

    getTemplatesMock.mockResolvedValueOnce(fixtures.evm.airnodeRrp.getTemplates());
    checkAuthorizationStatusesMock.mockResolvedValueOnce([true, true]);

    const state = fixtures.buildEVMProviderState();
    const res = await initializeProvider(state);
    expect(res?.requests.apiCalls).toEqual([
      {
        airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
        chainId: '31337',
        requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        sponsorWalletAddress: '0x91Fa5bf7FE3cF2a8970B031b1EB6f824fFe228BE',
        encodedParameters:
          '0x316200000000000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000',
        id: '0x70c03b74a037c83f8cac260413eae669e161f256c9c312ad0363ed4657033fef',
        endpointId: '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6',
        fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        fulfillFunctionId: '0x7c1de7e1',
        metadata: {
          address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          blockNumber: 12,
          currentBlock: currentBlockNumber,
          ignoreBlockedRequestsAfterBlocks: 20,
          transactionHash: '0x07ac0f0e0915f11216c86b1dfad7ef05c1daa80ee607d18648d8b447e75caebd',
        },
        parameters: {
          from: 'ETH',
          to: 'USD',
          _type: 'int256',
          _path: 'result',
          _times: '100000',
        },
        requestCount: '1',
        sponsorAddress: '0x61648B2Ec3e6b3492E90184Ef281C2ba28a675ec',
        status: 'Pending',
        template: {
          airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
          encodedParameters:
            '0x3162626262000000000000000000000000000000000000000000000000000000746f00000000000000000000000000000000000000000000000000000000000055534400000000000000000000000000000000000000000000000000000000005f74797065000000000000000000000000000000000000000000000000000000696e7432353600000000000000000000000000000000000000000000000000005f70617468000000000000000000000000000000000000000000000000000000726573756c7400000000000000000000000000000000000000000000000000005f74696d657300000000000000000000000000000000000000000000000000003130303030300000000000000000000000000000000000000000000000000000',
          endpointId: '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6',
          id: '0x441afbe66277833474b7b55975a5bb9d51fa8fb48a856dc1dbf1ce018e1638a9',
        },
        templateId: '0x441afbe66277833474b7b55975a5bb9d51fa8fb48a856dc1dbf1ce018e1638a9',
        type: 'template',
      },
      {
        airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
        chainId: '31337',
        requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        sponsorWalletAddress: '0x91Fa5bf7FE3cF2a8970B031b1EB6f824fFe228BE',
        encodedParameters:
          '0x316262626262000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000746f00000000000000000000000000000000000000000000000000000000000055534400000000000000000000000000000000000000000000000000000000005f74797065000000000000000000000000000000000000000000000000000000696e7432353600000000000000000000000000000000000000000000000000005f70617468000000000000000000000000000000000000000000000000000000726573756c7400000000000000000000000000000000000000000000000000005f74696d657300000000000000000000000000000000000000000000000000003130303030300000000000000000000000000000000000000000000000000000',
        id: '0x8d6d6ce1ac5020c4db26c34ae42fa8318a51fa21faef9a65663724641b369e63',
        endpointId: '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6',
        fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        fulfillFunctionId: '0x7c1de7e1',
        metadata: {
          address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          blockNumber: 13,
          currentBlock: currentBlockNumber,
          ignoreBlockedRequestsAfterBlocks: 20,
          transactionHash: '0xbc652033fc6d20b3e0b35213b570e41155b08fb05605c67fb3478cfa521769bb',
        },
        parameters: {
          from: 'ETH',
          to: 'USD',
          _type: 'int256',
          _path: 'result',
          _times: '100000',
        },
        requestCount: '2',
        sponsorAddress: '0x61648B2Ec3e6b3492E90184Ef281C2ba28a675ec',
        status: 'Pending',
        templateId: null,
        type: 'full',
      },
    ]);
  });

  it('does nothing if requests cannot be fetched', async () => {
    const getBlockNumberSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBlockNumber');
    getBlockNumberSpy.mockResolvedValueOnce(12);

    const getLogsSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
    getLogsSpy.mockRejectedValue(new Error('Server did not respond'));

    const state = fixtures.buildEVMProviderState();
    const res = await initializeProvider(state);
    expect(res).toEqual(null);
    expect(getLogsSpy).toHaveBeenCalledTimes(2);
  });
});
