import range from 'lodash/range';
import { applyChainLimits } from './chain-limits';
import * as fixtures from '../../../test/fixtures';
import { ProviderStates, ProviderState, EVMProviderState, GroupedRequests } from '../../types';
import { ChainConfig } from '../../config';

const createChainConfig = (overrides: Partial<ChainConfig>): ChainConfig => {
  return {
    maxConcurrency: 100,
    authorizers: {
      requesterEndpointAuthorizers: [],
      crossChainRequesterAuthorizers: [],
      requesterAuthorizersWithErc721: [],
      crossChainRequesterAuthorizersWithErc721: [],
    },
    authorizations: {
      requesterEndpointAuthorizations: {},
    },
    contracts: {
      AirnodeRrp: '0x197F3826040dF832481f835652c290aC7c41f073',
    },
    id: '31337',
    type: 'evm',
    options: {
      fulfillmentGasLimit: 123456,
      gasPriceOracle: [
        {
          gasPriceStrategy: 'constantGasPrice',
          gasPrice: {
            value: 10,
            unit: 'gwei',
          },
        },
      ],
    },
    providers: {},
    ...overrides,
  };
};

const createProviderState = (
  requests: GroupedRequests,
  chainId: string,
  name: string
): ProviderState<EVMProviderState> => {
  // We do not care about most of the properties so it's fine to just define the ones we need
  return {
    requests,
    settings: {
      chainId,
      name,
    },
  } as any;
};

const createRequests = (apiCallsCount: number, withdrawalCount: number): GroupedRequests => {
  // We want the generated requests to be sorted by the order of execution
  let blockNumber = 12345;

  return {
    apiCalls: range(apiCallsCount).map(() => {
      return fixtures.requests.buildApiCall({
        metadata: fixtures.requests.buildMetadata({ blockNumber: blockNumber++ }),
      });
    }),
    withdrawals: range(withdrawalCount).map(() => {
      return fixtures.requests.buildApiCall({
        metadata: fixtures.requests.buildMetadata({ blockNumber: blockNumber++ }),
      });
    }),
  };
};

describe('applyChainLimits', () => {
  it('does not drop request if there number is below the limit', () => {
    const providers = {
      maliciousProvider: { url: 'http://localhost:4110' },
      honestProvider: { url: 'http://localhost:4111' },
      outdatedProvider: { url: 'http://localhost:4112' },
    };
    const chainId = '31337';
    const maxConcurrency = 20;
    const config = fixtures.buildConfig({
      chains: [createChainConfig({ maxConcurrency, providers, id: chainId })],
    });
    const evmProviderStates = [
      createProviderState(createRequests(8, 2), chainId, 'maliciousProvider'),
      createProviderState(createRequests(3, 1), chainId, 'honestProvider'),
      createProviderState(createRequests(2, 1), chainId, 'outdatedProvider'),
    ];
    const providerStates: ProviderStates = { evm: evmProviderStates };

    const [logs, result] = applyChainLimits(config, providerStates);

    // Verify that the no requests were ignored
    const allRequestsCount = evmProviderStates.reduce(
      (sum, { requests }) => sum + requests.apiCalls.length + requests.withdrawals.length,
      0
    );
    expect(allRequestsCount).toBe(17);
    expect(logs).toHaveLength(0);
    expect(result.evm[0].requests.apiCalls).toHaveLength(8);
    expect(result.evm[0].requests.withdrawals).toHaveLength(2);
    expect(result.evm[1].requests.apiCalls).toHaveLength(3);
    expect(result.evm[1].requests.withdrawals).toHaveLength(1);
    expect(result.evm[2].requests.apiCalls).toHaveLength(2);
    expect(result.evm[2].requests.withdrawals).toHaveLength(1);
  });

  it('drops request from providers with the most requests', () => {
    const providers = {
      maliciousProvider: { url: 'http://localhost:4110' },
      honestProvider: { url: 'http://localhost:4111' },
      outdatedProvider: { url: 'http://localhost:4112' },
    };
    const chainId = '31337';
    const maxConcurrency = 10;
    const config = fixtures.buildConfig({
      chains: [createChainConfig({ maxConcurrency, providers, id: chainId })],
    });
    const evmProviderStates = [
      createProviderState(createRequests(8, 2), chainId, 'maliciousProvider'),
      createProviderState(createRequests(3, 1), chainId, 'honestProvider'),
      createProviderState(createRequests(2, 1), chainId, 'outdatedProvider'),
    ];
    const providerStates: ProviderStates = { evm: evmProviderStates };

    const [logs, result] = applyChainLimits(config, providerStates);

    // Verify that the correct amount of requests was ignored
    const allRequestsCount = evmProviderStates.reduce(
      (sum, { requests }) => sum + requests.apiCalls.length + requests.withdrawals.length,
      0
    );
    expect(allRequestsCount).toBe(17);
    expect(logs).toHaveLength(allRequestsCount - maxConcurrency);

    // Verify that they were ignored from the providers with most requests
    expect(result.evm[0].requests.apiCalls).toHaveLength(4);
    expect(result.evm[0].requests.withdrawals).toHaveLength(0);
    expect(result.evm[1].requests.apiCalls).toHaveLength(3);
    expect(result.evm[1].requests.withdrawals).toHaveLength(0);
    expect(result.evm[2].requests.apiCalls).toHaveLength(2);
    expect(result.evm[2].requests.withdrawals).toHaveLength(1);
  });

  it('limits for different chains are unrelated', () => {
    const providers = {
      maliciousProvider: { url: 'http://localhost:4110' },
      honestProvider: { url: 'http://localhost:4111' },
      outdatedProvider: { url: 'http://localhost:4112' },
    };
    const chainId1 = '31337';
    const maxConcurrency1 = 20;
    const chainId2 = '12345';
    const maxConcurrency2 = 10;
    const config = fixtures.buildConfig({
      chains: [
        createChainConfig({ maxConcurrency: maxConcurrency1, providers, id: chainId1 }),
        createChainConfig({ maxConcurrency: maxConcurrency2, providers, id: chainId2 }),
      ],
    });
    const evmProviderStates = [
      createProviderState(createRequests(8, 2), chainId1, 'maliciousProvider'),
      createProviderState(createRequests(3, 1), chainId1, 'honestProvider'),
      createProviderState(createRequests(2, 1), chainId1, 'outdatedProvider'),
      createProviderState(createRequests(8, 2), chainId2, 'maliciousProvider'),
      createProviderState(createRequests(3, 1), chainId2, 'honestProvider'),
      createProviderState(createRequests(2, 1), chainId2, 'outdatedProvider'),
    ];
    const providerStates: ProviderStates = { evm: evmProviderStates };

    const [logs, result] = applyChainLimits(config, providerStates);

    expect(logs).toHaveLength(7);
    // Verify that requests were ignored only from the second chain
    expect(result.evm[3].requests.apiCalls).toHaveLength(4);
    expect(result.evm[3].requests.withdrawals).toHaveLength(0);
    expect(result.evm[4].requests.apiCalls).toHaveLength(3);
    expect(result.evm[4].requests.withdrawals).toHaveLength(0);
    expect(result.evm[5].requests.apiCalls).toHaveLength(2);
    expect(result.evm[5].requests.withdrawals).toHaveLength(1);
    // Verify that none of the requests from the first chain are removed
    expect(result.evm[0].requests.apiCalls).toHaveLength(8);
    expect(result.evm[0].requests.withdrawals).toHaveLength(2);
    expect(result.evm[1].requests.apiCalls).toHaveLength(3);
    expect(result.evm[1].requests.withdrawals).toHaveLength(1);
    expect(result.evm[2].requests.apiCalls).toHaveLength(2);
    expect(result.evm[2].requests.withdrawals).toHaveLength(1);
  });
});
