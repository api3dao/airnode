import { ethers } from 'ethers';
import * as adapter from '@airnode/adapter';
import { initializeProvider } from './initialize-provider';
import * as fixtures from 'test/fixtures';

const checkAuthorizationStatusesMock = jest.fn();
const getAirnodeParametersAndBlockNumberMock = jest.fn();
const getTemplatesMock = jest.fn();
jest.mock('ethers', () => ({
  ethers: {
    ...jest.requireActual('ethers'),
    Contract: jest.fn().mockImplementation(() => ({
      checkAuthorizationStatuses: checkAuthorizationStatusesMock,
      getAirnodeParametersAndBlockNumber: getAirnodeParametersAndBlockNumberMock,
      getTemplates: getTemplatesMock,
    })),
  },
}));

describe('initializeProvider', () => {
  it('fetches, maps and authorizes requests', async () => {
    getAirnodeParametersAndBlockNumberMock.mockResolvedValueOnce({
      admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      authorizers: [ethers.constants.AddressZero],
      blockNumber: ethers.BigNumber.from('12'),
      xpub:
        'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
    });

    const fullRequest = fixtures.evm.logs.buildFullClientRequest();
    const regularRequest = fixtures.evm.logs.buildClientRequest();
    const withdrawal = fixtures.evm.logs.buildWithdrawalRequest();
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
        airnodeId: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
        chainId: '31337',
        clientAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        designatedWallet: '0x1c5b7e13fe3977a384397b17b060Ec96Ea322dEc',
        encodedParameters:
          '0x31626262626200000000000000000000000000000000000000000000000000005f74797065000000000000000000000000000000000000000000000000000000696e7432353600000000000000000000000000000000000000000000000000005f70617468000000000000000000000000000000000000000000000000000000726573756c7400000000000000000000000000000000000000000000000000005f74696d65730000000000000000000000000000000000000000000000000000313030303030000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000746f0000000000000000000000000000000000000000000000000000000000005553440000000000000000000000000000000000000000000000000000000000',
        endpointId: '0x3c8e59646e688707ddd3b1f07c4dbc5ab55a0257362a18569ac2644ccf6faddb',
        fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        fulfillFunctionId: '0x48a4157c',
        id: '0xc4a19131d2318ea0554b636b8d33e32a91d8412ff5a11f3371e08c7fb97664dd',
        metadata: {
          blockNumber: 16,
          currentBlock: 12,
          ignoreBlockedRequestsAfterBlocks: 20,
          transactionHash: '0xa4ccd606e7a2d167d8c3cc8dc04343398b85da0dfa96560245dfb68291f31127',
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
        airnodeId: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
        chainId: '31337',
        clientAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        designatedWallet: '0xD748Bc4212d8130879Ec4F24B950cAAb9EddfCB2',
        encodedParameters:
          '0x316262000000000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000746f0000000000000000000000000000000000000000000000000000000000005553440000000000000000000000000000000000000000000000000000000000',
        endpointId: '0x3c8e59646e688707ddd3b1f07c4dbc5ab55a0257362a18569ac2644ccf6faddb',
        fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        fulfillFunctionId: '0x48a4157c',
        id: '0x2f5bbfb2ad81ba5f426067d0a6942a400f70532e75484acec51f0cfd5f423ee5',
        metadata: {
          blockNumber: 12,
          currentBlock: 12,
          ignoreBlockedRequestsAfterBlocks: 20,
          transactionHash: '0x8304ce3f022325bf55d0fa3af7424d88ebb4fad0e17714ca0b72d417cb681e9b',
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
        templateId: '0x3ea868f2ff8782d84a80bb16a33c014f9c1ef1cae168f7c5714f7e2ba6eff26e',
        type: 'regular',
      },
    ]);
  });

  it('does nothing if unable to verify or set Airnode parameters', async () => {
    const getLogsSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
    getAirnodeParametersAndBlockNumberMock.mockResolvedValueOnce(null);
    const state = fixtures.buildEVMProviderState();
    const res = await initializeProvider(state);
    expect(res).toEqual(null);
    expect(getLogsSpy).not.toHaveBeenCalled();
  });

  it('does nothing if requests cannot be fetched', async () => {
    getAirnodeParametersAndBlockNumberMock.mockResolvedValueOnce({
      admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      authorizers: [ethers.constants.AddressZero],
      blockNumber: ethers.BigNumber.from('12'),
      xpub:
        'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
    });

    const getLogsSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
    getLogsSpy.mockRejectedValue(new Error('Server did not respond'));

    const state = fixtures.buildEVMProviderState();
    const res = await initializeProvider(state);
    expect(res).toEqual(null);
    expect(getLogsSpy).toHaveBeenCalledTimes(2);
  });

  it('does nothing if unable to verify or set Airnode parameters', async () => {
    const getLogsSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
    getAirnodeParametersAndBlockNumberMock.mockResolvedValueOnce(null);
    const state = fixtures.buildEVMProviderState();
    const res = await initializeProvider(state);
    expect(res).toEqual(null);
    expect(getLogsSpy).not.toHaveBeenCalled();
  });

  it('does nothing if requests cannot be fetched', async () => {
    getAirnodeParametersAndBlockNumberMock.mockResolvedValueOnce({
      admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
      authorizers: [ethers.constants.AddressZero],
      blockNumber: ethers.BigNumber.from('12'),
      xpub:
        'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
    });

    const getLogsSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
    getLogsSpy.mockRejectedValue(new Error('Server did not respond'));

    const state = fixtures.buildEVMProviderState();
    const res = await initializeProvider(state);
    expect(res).toEqual(null);
    expect(getLogsSpy).toHaveBeenCalledTimes(2);
  });
});
