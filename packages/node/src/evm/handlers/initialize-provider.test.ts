import { ethers } from 'ethers';
import * as adapter from '@airnode/adapter';
import { initializeProvider } from './initialize-provider';
import * as fixtures from 'test/fixtures';

const checkAuthorizationStatusesMock = jest.fn();
const getProviderAndBlockNumberMock = jest.fn();
const getTemplatesMock = jest.fn();
jest.mock('ethers', () => ({
  ethers: {
    ...jest.requireActual('ethers'),
    Contract: jest.fn().mockImplementation(() => ({
      checkAuthorizationStatuses: checkAuthorizationStatusesMock,
      getProviderAndBlockNumber: getProviderAndBlockNumberMock,
      getTemplates: getTemplatesMock,
    })),
  },
}));

describe('initializeProvider', () => {
  it('fetches, maps and authorizes requests', async () => {
    getProviderAndBlockNumberMock.mockResolvedValueOnce({
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

    getTemplatesMock.mockResolvedValueOnce(fixtures.evm.airnode.getTemplates());
    checkAuthorizationStatusesMock.mockResolvedValueOnce([true, true]);

    const state = fixtures.buildEVMProviderState();
    const res = await initializeProvider(state);
    expect(res?.requests.apiCalls).toEqual([
      {
        clientAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        designatedWallet: '0xa46c4b41d72Ada9D14157b28A8a2Db97560fFF12',
        encodedParameters:
          '0x316262626262000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000746f00000000000000000000000000000000000000000000000000000000000055534400000000000000000000000000000000000000000000000000000000005f74797065000000000000000000000000000000000000000000000000000000696e7432353600000000000000000000000000000000000000000000000000005f70617468000000000000000000000000000000000000000000000000000000726573756c7400000000000000000000000000000000000000000000000000005f74696d657300000000000000000000000000000000000000000000000000003130303030300000000000000000000000000000000000000000000000000000',
        endpointId: '0xac2e948e29db14b568a3cbaeedc66c0f9b5c5312f6b562784889e8cbd6a6dd9e',
        fulfillAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        fulfillFunctionId: '0x48a4157c',
        id: '0xb49ca9685c0e1edd5e003574498f361192758770c55d8287f5a468e7717b8d9e',
        metadata: {
          blockNumber: 17,
          currentBlock: 12,
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
        requestCount: '3',
        requesterIndex: '2',
        status: 'Pending',
        templateId: null,
        type: 'full',
      },
      {
        clientAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        designatedWallet: '0xa46c4b41d72Ada9D14157b28A8a2Db97560fFF12',
        encodedParameters:
          '0x316200000000000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000',
        endpointId: '0xac2e948e29db14b568a3cbaeedc66c0f9b5c5312f6b562784889e8cbd6a6dd9e',
        fulfillAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        fulfillFunctionId: '0x48a4157c',
        id: '0xe2347d69997f674902398ea1b43239ed8f4fcf81a1baa7a904e37f15e0c85e7e',
        metadata: {
          blockNumber: 16,
          currentBlock: 12,
          ignoreBlockedRequestsAfterBlocks: 20,
          transactionHash: '0x33187e7e8af331baa11ba964b39d65f3d9127dbcf285a34a4b6f0d5c5d7babd7',
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
        templateId: '0x537522dde3d2d4fb409b9c278d0b08de85f5aea7339efd23c5a8d7316242d2db',
        type: 'regular',
      },
    ]);
  });

  it('does nothing if unable to find or create the provider', async () => {
    const getLogsSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
    getProviderAndBlockNumberMock.mockResolvedValueOnce(null);
    const state = fixtures.buildEVMProviderState();
    const res = await initializeProvider(state);
    expect(res).toEqual(null);
    expect(getLogsSpy).not.toHaveBeenCalled();
  });

  it('does nothing if requests cannot be fetched', async () => {
    getProviderAndBlockNumberMock.mockResolvedValueOnce({
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

  it('does nothing if unable to find or create the provider', async () => {
    const getLogsSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
    getProviderAndBlockNumberMock.mockResolvedValueOnce(null);
    const state = fixtures.buildEVMProviderState();
    const res = await initializeProvider(state);
    expect(res).toEqual(null);
    expect(getLogsSpy).not.toHaveBeenCalled();
  });

  it('does nothing if requests cannot be fetched', async () => {
    getProviderAndBlockNumberMock.mockResolvedValueOnce({
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
