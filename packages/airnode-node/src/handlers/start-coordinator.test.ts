import { createAndMockGasTarget, mockEthers, mockReadFileSync } from '../../test/mock-utils';

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

import { ethers } from 'ethers';
import * as adapter from '@api3/airnode-adapter';
import * as validator from '@api3/airnode-validator';
import { randomHexString, caching } from '@api3/airnode-utilities';
import { getMinConfirmationsReservedParameter, startCoordinator } from './start-coordinator';
import * as fixtures from '../../test/fixtures';
import * as calls from '../coordinator/calls';
import { buildAggregatedRegularApiCall, buildConfig } from '../../test/fixtures';
import { BLOCK_COUNT_HISTORY_LIMIT } from '../constants';
import { DEPLOYMENT_ID_LENGTH } from '../workers';

const deploymentIdRegex = RegExp(`local[0-9a-f]{${DEPLOYMENT_ID_LENGTH}}`);

describe('startCoordinator', () => {
  jest.setTimeout(30_000);
  fixtures.setEnvVariables({ AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey() });
  const coordinatorId = randomHexString(16);
  const requestId = '0x894580d6cffd205170373f9b95adfe58b65d63f273bb9945e81fa5f0d7901ffe';
  const encodedValue = '0x0000000000000000000000000000000000000000000000000000000002a5213d';
  const signature =
    '0x69567b16514c2b799597247462cc6c3d9ac9dce88c0bc97c17db45dfb572cacb0fc7b38b2a73cf1fd78279251e5ef75b5e6fb06f4b0f0d023c4b215609e2e38f1b';
  const initialConfig = fixtures.buildConfig();
  const baseConfig = {
    ...initialConfig,
    chains: initialConfig.chains.map((chain) => ({
      ...chain,
      options: {
        ...chain.options,
        fulfillmentGasLimit: 500_000,
      },
    })),
  };

  test.each(['legacy', 'eip1559'] as const)(`fetches and processes uncached requests - txType: %s`, async (txType) => {
    const config = baseConfig;
    mockReadFileSync('config.json', JSON.stringify(config));
    jest.spyOn(validator, 'unsafeParseConfigWithSecrets').mockReturnValue(config);

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

    const { gasTarget: gasTargetMock, blockWithTransactionsSpy } = createAndMockGasTarget(txType);
    // Set gasTarget to type 0 since only providerRecommendedEip1559GasPriceStrategy returns type 2 values
    const gasTarget =
      txType === 'eip1559'
        ? { type: 0, gasPrice: gasTargetMock.maxFeePerGas, gasLimit: gasTargetMock.gasLimit }
        : gasTargetMock;

    const txCountSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getTransactionCount');
    txCountSpy.mockResolvedValueOnce(212);

    const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
    balanceSpy.mockResolvedValueOnce(ethers.BigNumber.from(250_000_000));

    estimateGasWithdrawalMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
    staticFulfillMock.mockResolvedValueOnce({ callSuccess: true });
    fulfillMock.mockResolvedValueOnce({
      hash: '0xad33fe94de7294c6ab461325828276185dff6fed92c54b15ac039c6160d2bac3',
    });

    await startCoordinator(config, coordinatorId);

    expect(blockWithTransactionsSpy).toHaveBeenCalled();
    // API call was submitted
    expect(fulfillMock).toHaveBeenCalledTimes(1);
    expect(fulfillMock).toHaveBeenCalledWith(
      requestId,
      '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
      '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      '0x7c1de7e1',
      encodedValue,
      signature,
      { ...gasTarget, nonce: 212 }
    );
  });

  test.each(['legacy', 'eip1559'] as const)(`fetches and processes cached requests - txType: %s`, async (txType) => {
    const config = {
      ...baseConfig,
      triggers: {
        ...baseConfig.triggers,
        rrp: baseConfig.triggers.rrp.map((rrp) => ({
          ...rrp,
          cacheResponses: true,
        })),
      },
    };
    mockReadFileSync('config.json', JSON.stringify(config));
    jest.spyOn(validator, 'unsafeParseConfigWithSecrets').mockReturnValue(config);

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

    const { gasTarget: gasTargetMock, blockWithTransactionsSpy } = createAndMockGasTarget(txType);
    // Set gasTarget to type 0 since only providerRecommendedEip1559GasPriceStrategy returns type 2 values
    const gasTarget =
      txType === 'eip1559'
        ? { type: 0, gasPrice: gasTargetMock.maxFeePerGas, gasLimit: gasTargetMock.gasLimit }
        : gasTargetMock;

    const txCountSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getTransactionCount');
    txCountSpy.mockResolvedValueOnce(212);

    const balanceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBalance');
    balanceSpy.mockResolvedValueOnce(ethers.BigNumber.from(250_000_000));

    estimateGasWithdrawalMock.mockResolvedValueOnce(ethers.BigNumber.from(50_000));
    staticFulfillMock.mockResolvedValueOnce({ callSuccess: true });
    fulfillMock.mockResolvedValueOnce({
      hash: '0xad33fe94de7294c6ab461325828276185dff6fed92c54b15ac039c6160d2bac3',
    });

    const cachedKeysSpy = jest.spyOn(caching, 'getKeys');
    cachedKeysSpy.mockReturnValueOnce([`requestId-${requestId}`]);

    const cachedValueSpy = jest.spyOn(caching, 'getValueForKey');
    cachedValueSpy.mockReturnValueOnce({
      encodedValue: encodedValue,
      signature: signature,
    });

    const callApisSpy = jest.spyOn(calls, 'callApis');

    await startCoordinator(config, coordinatorId);

    // cached requests should not trigger an API call
    expect(callApisSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        deploymentId: expect.stringMatching(deploymentIdRegex),
      })
    );

    expect(blockWithTransactionsSpy).toHaveBeenCalled();
    // API call was submitted
    expect(fulfillMock).toHaveBeenCalledTimes(1);
    expect(fulfillMock).toHaveBeenCalledWith(
      requestId,
      '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
      '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      '0x7c1de7e1',
      encodedValue,
      signature,
      { ...gasTarget, nonce: 212 }
    );
  });

  it('returns early if there are no processable requests', async () => {
    const config = fixtures.buildConfig();
    mockReadFileSync('config.json', JSON.stringify(config));

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

    await startCoordinator(config, coordinatorId);

    expect(gasPriceSpy).not.toHaveBeenCalled();
    expect(executeSpy).not.toHaveBeenCalled();
    expect(txCountSpy).not.toHaveBeenCalled();
    expect(balanceSpy).not.toHaveBeenCalled();
    expect(contract.fulfill).not.toHaveBeenCalled();
  });
});

describe('getMinConfirmationsReservedParameter', () => {
  const config = buildConfig();

  it('returns _minConfirmations reserved parameter as a number', () => {
    const aggregatedRegularApiCall = buildAggregatedRegularApiCall();
    aggregatedRegularApiCall.parameters = { ...aggregatedRegularApiCall.parameters, _minConfirmations: '0' };
    expect(getMinConfirmationsReservedParameter(aggregatedRegularApiCall, config)).toEqual(0);
  });

  it('returns undefined for a missing or invalid _minConfirmations reserved parameter', () => {
    const aggregatedRegularApiCall = buildAggregatedRegularApiCall();
    expect(getMinConfirmationsReservedParameter(aggregatedRegularApiCall, config)).toBe(undefined);

    aggregatedRegularApiCall.parameters = { ...aggregatedRegularApiCall.parameters, _minConfirmations: '-1' };
    expect(getMinConfirmationsReservedParameter(aggregatedRegularApiCall, config)).toBe(undefined);

    aggregatedRegularApiCall.parameters = { ...aggregatedRegularApiCall.parameters, _minConfirmations: '34.2' };
    expect(getMinConfirmationsReservedParameter(aggregatedRegularApiCall, config)).toBe(undefined);

    aggregatedRegularApiCall.parameters = {
      ...aggregatedRegularApiCall.parameters,
      _minConfirmations: (BLOCK_COUNT_HISTORY_LIMIT + 1).toString(),
    };
    expect(getMinConfirmationsReservedParameter(aggregatedRegularApiCall, config)).toBe(undefined);
  });
});
