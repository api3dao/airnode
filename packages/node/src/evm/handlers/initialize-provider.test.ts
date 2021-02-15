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

it('asd', () => {});

// describe('initializeProvider', () => {
//   it('fetches, maps and authorizes requests', async () => {
//     getProviderAndBlockNumberMock.mockResolvedValueOnce({
//       admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
//       blockNumber: ethers.BigNumber.from('12'),
//       xpub:
//         'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
//     });
//
//     const shortRequest = fixtures.evm.logs.buildShortClientRequest();
//     const regularRequest = fixtures.evm.logs.buildClientRequest();
//     const withdrawal = fixtures.evm.logs.buildWithdrawalRequest();
//     const getLogsSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
//     getLogsSpy.mockResolvedValueOnce([shortRequest, regularRequest, withdrawal]);
//
//     const executeSpy = jest.spyOn(adapter, 'buildAndExecuteRequest') as jest.SpyInstance;
//     executeSpy.mockResolvedValue({
//       data: { prices: ['443.76381', '441.83723'] },
//       status: 200,
//     });
//
//     getTemplatesMock.mockResolvedValueOnce(fixtures.evm.convenience.getTemplates());
//     checkAuthorizationStatusesMock.mockResolvedValueOnce([true, true]);
//
//     const state = fixtures.buildEVMProviderState();
//     const res = await initializeProvider(state);
//     expect(res?.requests.apiCalls).toEqual([
//       {
//         clientAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
//         designatedWallet: '0xa46c4b41d72Ada9D14157b28A8a2Db97560fFF12',
//         encodedParameters:
//           '0x316200000000000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000',
//         endpointId: '0xac2e948e29db14b568a3cbaeedc66c0f9b5c5312f6b562784889e8cbd6a6dd9e',
//         fulfillAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
//         fulfillFunctionId: '0xd3bd1464',
//         id: '0xb781aa3a3ebcd64f31ab8b71d856385cbf7ccd7bc4beec1f2d3185342727add3',
//         metadata: {
//           blockNumber: 15,
//           currentBlock: 12,
//           ignoreBlockedRequestsAfterBlocks: 20,
//           transactionHash: '0x09268ef53816b82b447d21f951c351669d97ca4597ebf3aac392fbb7236ea260',
//         },
//         parameters: {
//           _path: 'result',
//           _times: '100000',
//           _type: 'int256',
//           from: 'ETH',
//           to: 'USD',
//         },
//         providerId: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
//         requestCount: '0',
//         requesterIndex: '2',
//         status: 'Pending',
//         templateId: '0x9843d3ab43c584e58d82302e196d05efe4466773a61d259b6ecd99bd8baf411b',
//         type: 'short',
//       },
//       {
//         clientAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
//         designatedWallet: '0xa46c4b41d72Ada9D14157b28A8a2Db97560fFF12',
//         encodedParameters:
//           '0x316200000000000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000',
//         endpointId: '0xac2e948e29db14b568a3cbaeedc66c0f9b5c5312f6b562784889e8cbd6a6dd9e',
//         fulfillAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
//         fulfillFunctionId: '0xd3bd1464',
//         id: '0x42c0d4bc601936a673513a7601df394c1574c9af768dbb28ec3a65f019bafffd',
//         metadata: {
//           blockNumber: 16,
//           currentBlock: 12,
//           ignoreBlockedRequestsAfterBlocks: 20,
//           transactionHash: '0x33187e7e8af331baa11ba964b39d65f3d9127dbcf285a34a4b6f0d5c5d7babd7',
//         },
//         parameters: {
//           _path: 'result',
//           _times: '100000',
//           _type: 'int256',
//           from: 'ETH',
//           to: 'USD',
//         },
//         providerId: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
//         requestCount: '1',
//         requesterIndex: '2',
//         status: 'Pending',
//         templateId: '0x9843d3ab43c584e58d82302e196d05efe4466773a61d259b6ecd99bd8baf411b',
//         type: 'regular',
//       },
//     ]);
//   });
//
//   it('does nothing if unable to find or create the provider', async () => {
//     const getLogsSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
//     getProviderAndBlockNumberMock.mockResolvedValueOnce(null);
//     const state = fixtures.buildEVMProviderState();
//     const res = await initializeProvider(state);
//     expect(res).toEqual(null);
//     expect(getLogsSpy).not.toHaveBeenCalled();
//   });
//
//   it('does nothing if requests cannot be fetched', async () => {
//     getProviderAndBlockNumberMock.mockResolvedValueOnce({
//       admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
//       blockNumber: ethers.BigNumber.from('12'),
//       xpub:
//         'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
//     });
//
//     const getLogsSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
//     getLogsSpy.mockRejectedValue(new Error('Server did not respond'));
//
//     const state = fixtures.buildEVMProviderState();
//     const res = await initializeProvider(state);
//     expect(res).toEqual(null);
//     expect(getLogsSpy).toHaveBeenCalledTimes(2);
//   });
//
//   it('does nothing if unable to find or create the provider', async () => {
//     const getLogsSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
//     getProviderAndBlockNumberMock.mockResolvedValueOnce(null);
//     const state = fixtures.buildEVMProviderState();
//     const res = await initializeProvider(state);
//     expect(res).toEqual(null);
//     expect(getLogsSpy).not.toHaveBeenCalled();
//   });

//   it('does nothing if requests cannot be fetched', async () => {
//     getProviderAndBlockNumberMock.mockResolvedValueOnce({
//       admin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
//       blockNumber: ethers.BigNumber.from('12'),
//       xpub:
//         'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx',
//     });

//     const getLogsSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
//     getLogsSpy.mockRejectedValue(new Error('Server did not respond'));

//     const state = fixtures.buildEVMProviderState();
//     const res = await initializeProvider(state);
//     expect(res).toEqual(null);
//     expect(getLogsSpy).toHaveBeenCalledTimes(2);
//   });
// });
