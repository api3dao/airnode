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
    jest.setTimeout(30_000);
    const getBlockNumberSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBlockNumber');
    getBlockNumberSpy.mockResolvedValueOnce(12);

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
        sponsorWalletAddress: '0x04aE2916E93e621E9Bd29b83A7D47FEA70036F2e',
        encodedParameters:
          '0x316200000000000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000',
        id: '0x389ed0979942f53a68aa855b5dae391f3979f77f7fa417de4bf99361f48a4507',
        endpointId: '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353',
        fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        fulfillFunctionId: '0x7c1de7e1',
        metadata: {
          blockNumber: 12,
          currentBlock: 12,
          ignoreBlockedRequestsAfterBlocks: 20,
          transactionHash: '0xdda45291bc2807601416bb9ac2e7c3350606ddd6d4f539472906b687d774b57f',
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
        templateId: '0xe4a1b9c33b9dda81f38b6e84c1bf59fcf5dd197039efc34edfaa61cfeb01b217',
        type: 'template',
      },
      {
        airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
        chainId: '31337',
        requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        sponsorWalletAddress: '0x04aE2916E93e621E9Bd29b83A7D47FEA70036F2e',
        encodedParameters:
          '0x316262626262000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000746f00000000000000000000000000000000000000000000000000000000000055534400000000000000000000000000000000000000000000000000000000005f74797065000000000000000000000000000000000000000000000000000000696e7432353600000000000000000000000000000000000000000000000000005f70617468000000000000000000000000000000000000000000000000000000726573756c7400000000000000000000000000000000000000000000000000005f74696d657300000000000000000000000000000000000000000000000000003130303030300000000000000000000000000000000000000000000000000000',
        id: '0x4a02f3576f679789160bbb6566ff98c30d2d496b11ec0a96fadb2d56707e2155',
        endpointId: '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353',
        fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        fulfillFunctionId: '0x7c1de7e1',
        metadata: {
          blockNumber: 13,
          currentBlock: 12,
          ignoreBlockedRequestsAfterBlocks: 20,
          transactionHash: '0x3f18b9a77c8c665b348119295c664919caf3566ff10bc1745df30e8a7f0662af',
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
