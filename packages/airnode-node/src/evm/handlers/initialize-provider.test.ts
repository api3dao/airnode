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
import { initializeProvider, mergeAuthorizationsByRequestId } from './initialize-provider';
import * as fixtures from '../../../test/fixtures';
import { AuthorizationByRequestId } from '../../types';
import * as authorizationFetching from '../authorization/authorization-fetching';

describe('initializeProvider', () => {
  jest.setTimeout(30_000);
  fixtures.setEnvVariables({ AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey() });

  it('fetches, maps and authorizes requests', async () => {
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
    const fetchAuthorizationsSpy = jest.spyOn(authorizationFetching, 'fetch');

    const state = fixtures.buildEVMProviderState();
    const res = await initializeProvider(state);
    // Empty authorizer arrays short-circuits authorization fetching
    expect(fetchAuthorizationsSpy).toHaveBeenCalledTimes(0);
    expect(res?.requests.apiCalls).toEqual([
      {
        airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
        chainId: '31337',
        requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        sponsorWalletAddress: '0x91Fa5bf7FE3cF2a8970B031b1EB6f824fFe228BE',
        encodedParameters:
          '0x317300000000000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000',
        id: '0x894580d6cffd205170373f9b95adfe58b65d63f273bb9945e81fa5f0d7901ffe',
        endpointId: '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6',
        fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        fulfillFunctionId: '0x7c1de7e1',
        metadata: {
          address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          blockNumber: 12,
          currentBlock: currentBlockNumber,
          minConfirmations: 0,
          transactionHash: '0x40b93a1e81c7162460af066be96266ff692515a2f6b54bd622aa9f82ee00670f',
          logIndex: 0,
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
        template: {
          airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
          encodedParameters:
            '0x3173737373000000000000000000000000000000000000000000000000000000746f00000000000000000000000000000000000000000000000000000000000055534400000000000000000000000000000000000000000000000000000000005f74797065000000000000000000000000000000000000000000000000000000696e7432353600000000000000000000000000000000000000000000000000005f70617468000000000000000000000000000000000000000000000000000000726573756c7400000000000000000000000000000000000000000000000000005f74696d657300000000000000000000000000000000000000000000000000003130303030300000000000000000000000000000000000000000000000000000',
          endpointId: '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6',
          id: '0xb3df2ca7646e7823c18038ed320ae3fa29bcd7452fdcd91398833da362df1b46',
        },
        templateId: '0xb3df2ca7646e7823c18038ed320ae3fa29bcd7452fdcd91398833da362df1b46',
        type: 'template',
      },
      {
        airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
        chainId: '31337',
        requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        sponsorWalletAddress: '0x91Fa5bf7FE3cF2a8970B031b1EB6f824fFe228BE',
        encodedParameters:
          '0x317373737373000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000746f00000000000000000000000000000000000000000000000000000000000055534400000000000000000000000000000000000000000000000000000000005f74797065000000000000000000000000000000000000000000000000000000696e7432353600000000000000000000000000000000000000000000000000005f70617468000000000000000000000000000000000000000000000000000000726573756c7400000000000000000000000000000000000000000000000000005f74696d657300000000000000000000000000000000000000000000000000003130303030300000000000000000000000000000000000000000000000000000',
        id: '0x263c11afed6cff9933cc46487ce6b10cf36a795e4908724c09da9e1c16f43799',
        endpointId: '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6',
        fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        fulfillFunctionId: '0x7c1de7e1',
        metadata: {
          address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          blockNumber: 13,
          currentBlock: currentBlockNumber,
          minConfirmations: 0,
          transactionHash: '0x420ebda3f246256ced7a58fb72d28d99548eb30de6d2e4d5c767fb547ff795ff',
          logIndex: 0,
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
        templateId: null,
        type: 'full',
      },
    ]);
  });

  it('uses valid config authorizations, maps and authorizes requests', async () => {
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

    const state = fixtures.buildEVMProviderState();
    // Insert authorizations into config
    state.config!.chains[0].authorizations = {
      requesterEndpointAuthorizations: {
        '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6': [
          '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        ],
      },
    };
    const res = await initializeProvider(state);
    expect(checkAuthorizationStatusesMock).not.toHaveBeenCalled();
    expect(res?.requests.apiCalls).toEqual([
      {
        airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
        chainId: '31337',
        requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        sponsorWalletAddress: '0x91Fa5bf7FE3cF2a8970B031b1EB6f824fFe228BE',
        encodedParameters:
          '0x317300000000000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000',
        id: '0x894580d6cffd205170373f9b95adfe58b65d63f273bb9945e81fa5f0d7901ffe',
        endpointId: '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6',
        fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        fulfillFunctionId: '0x7c1de7e1',
        metadata: {
          address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          blockNumber: 12,
          currentBlock: currentBlockNumber,
          minConfirmations: 0,
          transactionHash: '0x40b93a1e81c7162460af066be96266ff692515a2f6b54bd622aa9f82ee00670f',
          logIndex: 0,
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
        template: {
          airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
          encodedParameters:
            '0x3173737373000000000000000000000000000000000000000000000000000000746f00000000000000000000000000000000000000000000000000000000000055534400000000000000000000000000000000000000000000000000000000005f74797065000000000000000000000000000000000000000000000000000000696e7432353600000000000000000000000000000000000000000000000000005f70617468000000000000000000000000000000000000000000000000000000726573756c7400000000000000000000000000000000000000000000000000005f74696d657300000000000000000000000000000000000000000000000000003130303030300000000000000000000000000000000000000000000000000000',
          endpointId: '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6',
          id: '0xb3df2ca7646e7823c18038ed320ae3fa29bcd7452fdcd91398833da362df1b46',
        },
        templateId: '0xb3df2ca7646e7823c18038ed320ae3fa29bcd7452fdcd91398833da362df1b46',
        type: 'template',
      },
      {
        airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
        chainId: '31337',
        requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        sponsorWalletAddress: '0x91Fa5bf7FE3cF2a8970B031b1EB6f824fFe228BE',
        encodedParameters:
          '0x317373737373000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000746f00000000000000000000000000000000000000000000000000000000000055534400000000000000000000000000000000000000000000000000000000005f74797065000000000000000000000000000000000000000000000000000000696e7432353600000000000000000000000000000000000000000000000000005f70617468000000000000000000000000000000000000000000000000000000726573756c7400000000000000000000000000000000000000000000000000005f74696d657300000000000000000000000000000000000000000000000000003130303030300000000000000000000000000000000000000000000000000000',
        id: '0x263c11afed6cff9933cc46487ce6b10cf36a795e4908724c09da9e1c16f43799',
        endpointId: '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6',
        fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        fulfillFunctionId: '0x7c1de7e1',
        metadata: {
          address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          blockNumber: 13,
          currentBlock: currentBlockNumber,
          minConfirmations: 0,
          transactionHash: '0x420ebda3f246256ced7a58fb72d28d99548eb30de6d2e4d5c767fb547ff795ff',
          logIndex: 0,
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
    expect(getLogsSpy).toHaveBeenCalledTimes(1);
  });

  it('merges same-chain and cross-chain authorizations', () => {
    const authorizations: AuthorizationByRequestId = {
      '0x1': false,
      '0x2': true,
      '0x3': true,
      '0x4': false,
      '0x5': false,
      '0x6': true,
      '0x7': false,
      '0x8': false,
      '0x9': false,
    };
    const crossChainAuthorizations: AuthorizationByRequestId = {
      '0x1': true,
      '0x2': true,
      '0x3': false,
      '0x4': false,
    };
    const erc721authorizations: AuthorizationByRequestId = {
      '0x1': false,
      '0x2': false,
      '0x3': false,
      '0x4': false,
      '0x5': false,
      '0x6': false,
      '0x7': true,
      '0x8': false,
      '0x9': false,
    };
    const erc721CrossChainAuthorizations: AuthorizationByRequestId = {
      '0x1': false,
      '0x2': false,
      '0x3': false,
      '0x4': false,
      '0x5': false,
      '0x6': false,
      '0x7': false,
      '0x8': true,
      '0x9': false,
    };

    const merged = mergeAuthorizationsByRequestId([
      authorizations,
      crossChainAuthorizations,
      erc721authorizations,
      erc721CrossChainAuthorizations,
    ]);
    expect(merged).toEqual({
      '0x1': true,
      '0x2': true,
      '0x3': true,
      '0x4': false,
      '0x5': false,
      '0x6': true,
      '0x7': true,
      '0x8': true,
      '0x9': false,
    } as AuthorizationByRequestId);
  });
});
