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
import * as adapter from '@api3/adapter';
import { initializeProvider } from './initialize-provider';
import * as fixtures from '../../../test/fixtures';

describe('initializeProvider', () => {
  it('fetches, maps and authorizes requests', async () => {
    const getBlockNumberSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBlockNumber');
    getBlockNumberSpy.mockResolvedValueOnce(12);

    const fullRequest = fixtures.evm.logs.buildMadeFullRequest();
    const regularRequest = fixtures.evm.logs.buildMadeTemplateRequest();
    const withdrawal = fixtures.evm.logs.buildRequestedWithdrawal();
    const getLogsSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
    getLogsSpy.mockResolvedValueOnce([fullRequest, regularRequest, withdrawal]);

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
        sponsorWallet: '0xB9F90B475F30c2CB0985b4e262dE85D92Fbba52A',
        encodedParameters:
          '0x316262626262000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000746f00000000000000000000000000000000000000000000000000000000000055534400000000000000000000000000000000000000000000000000000000005f74797065000000000000000000000000000000000000000000000000000000696e7432353600000000000000000000000000000000000000000000000000005f70617468000000000000000000000000000000000000000000000000000000726573756c7400000000000000000000000000000000000000000000000000005f74696d657300000000000000000000000000000000000000000000000000003130303030300000000000000000000000000000000000000000000000000000',
        endpointId: '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353',
        fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        fulfillFunctionId: '0x48a4157c',
        id: '0x9d3dec7d5f8da8e6d1a7d4220ef18719a693b30a2007898637d8fb4412e627db',
        metadata: {
          blockNumber: 12,
          currentBlock: 12,
          ignoreBlockedRequestsAfterBlocks: 20,
          transactionHash: '0xa4a35012384274d8d7b470f72c5fc3d713faa145d327999d037a4f0fcb3eaa0f',
        },
        parameters: {
          _path: 'result',
          _times: '100000',
          _type: 'int256',
          from: 'ETH',
          to: 'USD',
        },
        requestCount: '2',
        sponsorAddress: '0x212b5E1221057415074541852F1D4D9337BF9ca6',
        status: 'Pending',
        templateId: null,
        type: 'full',
      },
      {
        airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
        chainId: '31337',
        requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        sponsorWallet: '0x4F716a9a20D03be77753F3D3e856a5e180995Eda',
        encodedParameters:
          '0x316200000000000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000',
        endpointId: '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353',
        fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        fulfillFunctionId: '0x48a4157c',
        id: '0x0cde2637ece0845ecbb7d59e38f2679960455459830007f11994e05595808147',
        metadata: {
          blockNumber: 11,
          currentBlock: 12,
          ignoreBlockedRequestsAfterBlocks: 20,
          transactionHash: '0x41017e353b771d7a3b061e229359e6f18a1fb889ce8af184a05df12eed7d7a06',
        },
        parameters: {
          _path: 'result',
          _times: '100000',
          _type: 'int256',
          from: 'ETH',
          to: 'USD',
        },
        requestCount: '1',
        sponsorAddress: '0x641eeb15B15d8E2CFB5f9d6480B175d93c14e6B6',
        status: 'Pending',
        templateId: '0xe4a1b9c33b9dda81f38b6e84c1bf59fcf5dd197039efc34edfaa61cfeb01b217',
        type: 'regular',
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
