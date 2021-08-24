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
        airnodeAddress: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
        chainId: '31337',
        clientAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        sponsorWallet: '0x1c5b7e13fe3977a384397b17b060Ec96Ea322dEc',
        encodedParameters:
          '0x31626262626200000000000000000000000000000000000000000000000000005f74797065000000000000000000000000000000000000000000000000000000696e7432353600000000000000000000000000000000000000000000000000005f70617468000000000000000000000000000000000000000000000000000000726573756c7400000000000000000000000000000000000000000000000000005f74696d65730000000000000000000000000000000000000000000000000000313030303030000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000746f0000000000000000000000000000000000000000000000000000000000005553440000000000000000000000000000000000000000000000000000000000',
        endpointId: '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353',
        fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        fulfillFunctionId: '0x48a4157c',
        id: '0xd1984b7f40c4b5484b756360f56a41cb7ee164d8acd0e0f18f7a0bbf5a353e65',
        metadata: {
          blockNumber: 16,
          currentBlock: 12,
          ignoreBlockedRequestsAfterBlocks: 20,
          transactionHash: '0xa82113c5d0fa499ed0b48de7cafcd72c53e4dc9a99279c1876a591169dd06877',
        },
        parameters: {
          _path: 'result',
          _times: '100000',
          _type: 'int256',
          from: 'ETH',
          to: 'USD',
        },
        requestCount: '1',
        requesterIndex: '10',
        status: 'Pending',
        templateId: null,
        type: 'full',
      },
      {
        airnodeAddress: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
        chainId: '31337',
        clientAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        sponsorWallet: '0xD748Bc4212d8130879Ec4F24B950cAAb9EddfCB2',
        encodedParameters:
          '0x316262000000000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000746f0000000000000000000000000000000000000000000000000000000000005553440000000000000000000000000000000000000000000000000000000000',
        endpointId: '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353',
        fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        fulfillFunctionId: '0x48a4157c',
        id: '0x676274e2d1979dbdbd0b6915276fcb2cc3fb3be32862eab9d1d201882edc8c93',
        metadata: {
          blockNumber: 12,
          currentBlock: 12,
          ignoreBlockedRequestsAfterBlocks: 20,
          transactionHash: '0x1cfc090626709b59a7572886f763cc9756b9f2fd15a9ae9d4af9e3b1c71c736e',
        },
        parameters: {
          _path: 'result',
          _times: '100000',
          _type: 'int256',
          from: 'ETH',
          to: 'USD',
        },
        requestCount: '1',
        requesterIndex: '5',
        status: 'Pending',
        templateId: '0x41e0458b020642796b14db9bb790bcdebab805ec4b639232277f0e007b088796',
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
