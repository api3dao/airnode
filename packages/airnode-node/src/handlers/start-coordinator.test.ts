import { createAndMockGasTarget, mockEthers } from '../../test/mock-utils';

const checkAuthorizationStatusesMock = jest.fn();
const getTemplatesMock = jest.fn();
const estimateGasWithdrawalMock = jest.fn();
const failMock = jest.fn();
const fulfillMock = jest.fn();
const fulfillWithdrawalMock = jest.fn();
const staticFulfillMock = jest.fn();
mockEthers({
  airnodeRrpMocks: {
    callStatic: {
      fulfill: staticFulfillMock,
    },
    estimateGas: {
      fulfillWithdrawal: estimateGasWithdrawalMock,
    },
    checkAuthorizationStatuses: checkAuthorizationStatusesMock,
    fail: failMock,
    fulfill: fulfillMock,
    fulfillWithdrawal: fulfillWithdrawalMock,
    getTemplates: getTemplatesMock,
  },
});

import fs from 'fs';
import { ethers } from 'ethers';
import * as adapter from '@api3/airnode-adapter';
import * as validator from '@api3/airnode-validator';
import { startCoordinator } from './start-coordinator';
import * as fixtures from '../../test/fixtures';

describe('startCoordinator', () => {
  test.each(['legacy', 'eip1559'] as const)(`fetches and processes requests - txType: %s`, async (txType) => {
    jest.setTimeout(30000);
    const initialConfig = fixtures.buildConfig();
    const config = {
      ...initialConfig,
      chains: initialConfig.chains.map((chain) => ({
        ...chain,
        options: {
          txType,
        },
      })),
    };
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));
    jest.spyOn(validator, 'validateJsonWithTemplate').mockReturnValue({ valid: true, messages: [], specs: config });

    const getBlockNumberSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBlockNumber');
    getBlockNumberSpy.mockResolvedValueOnce(12);

    const templateRequest = fixtures.evm.logs.buildMadeTemplateRequest();
    const getLogsSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
    getLogsSpy.mockResolvedValueOnce([templateRequest]);

    const executeSpy = jest.spyOn(adapter, 'buildAndExecuteRequest') as jest.SpyInstance;
    executeSpy.mockResolvedValue({
      data: { result: '443.76381' },
      status: 200,
    });

    getTemplatesMock.mockResolvedValueOnce(fixtures.evm.airnodeRrp.getTemplates());
    checkAuthorizationStatusesMock.mockResolvedValueOnce([true]);

    const { gasTarget, blockSpy, gasPriceSpy } = createAndMockGasTarget(txType);

    const txCountSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getTransactionCount');
    txCountSpy.mockResolvedValueOnce(212);

    const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
    balanceSpy.mockResolvedValueOnce(ethers.BigNumber.from(250_000_000));

    estimateGasWithdrawalMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
    staticFulfillMock.mockResolvedValueOnce({ callSuccess: true });
    fulfillMock.mockResolvedValueOnce({
      hash: '0xad33fe94de7294c6ab461325828276185dff6fed92c54b15ac039c6160d2bac3',
    });

    await startCoordinator(config);

    expect(txType === 'legacy' ? blockSpy : gasPriceSpy).not.toHaveBeenCalled();
    expect(txType === 'eip1559' ? blockSpy : gasPriceSpy).toHaveBeenCalled();

    // API call was submitted
    expect(fulfillMock).toHaveBeenCalledTimes(1);
    expect(fulfillMock).toHaveBeenCalledWith(
      '0x894580d6cffd205170373f9b95adfe58b65d63f273bb9945e81fa5f0d7901ffe',
      '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
      '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      '0x7c1de7e1',
      '0x0000000000000000000000000000000000000000000000000000000002a5213d',
      '0x69567b16514c2b799597247462cc6c3d9ac9dce88c0bc97c17db45dfb572cacb0fc7b38b2a73cf1fd78279251e5ef75b5e6fb06f4b0f0d023c4b215609e2e38f1b',
      { gasLimit: 500_000, ...gasTarget, nonce: 212 }
    );
  });

  it('returns early if there are no processable requests', async () => {
    const config = fixtures.buildConfig();
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));

    const getBlockNumberSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBlockNumber');
    getBlockNumberSpy.mockResolvedValueOnce(12);

    const getLogsSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs');
    getLogsSpy.mockResolvedValueOnce([]);

    getTemplatesMock.mockResolvedValueOnce(fixtures.evm.airnodeRrp.getTemplates());
    checkAuthorizationStatusesMock.mockResolvedValueOnce([true]);

    const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
    const executeSpy = jest.spyOn(adapter, 'buildAndExecuteRequest') as jest.SpyInstance;
    const txCountSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getTransactionCount');
    const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');

    const contract = new ethers.Contract('address', ['ABI']);

    await startCoordinator(config);

    expect(gasPriceSpy).not.toHaveBeenCalled();
    expect(executeSpy).not.toHaveBeenCalled();
    expect(txCountSpy).not.toHaveBeenCalled();
    expect(balanceSpy).not.toHaveBeenCalled();
    expect(contract.fulfill).not.toHaveBeenCalled();
  });
});
