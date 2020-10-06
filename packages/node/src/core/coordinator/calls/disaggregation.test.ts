jest.mock('../../config', () => ({
  config: {
    triggers: {
      requests: [{ endpointId: 'endpointId', endpointName: 'endpointName', oisTitle: 'oisTitle' }],
    },
  },
}));

import * as fixtures from 'test/fixtures';
import * as coordinatorState from '../../coordinator/state';
import * as providerState from '../../providers/state';
import * as disaggregation from './disaggregation';

describe('disaggregate - ClientRequests', () => {
  it('maps aggregated responses back to requests for each provider', () => {
    const walletData0 = {
      address: '0x1',
      requests: {
        apiCalls: [fixtures.requests.createApiCall()],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 2,
    };
    const walletData1 = {
      address: '0x2',
      requests: {
        apiCalls: [fixtures.requests.createApiCall()],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 5,
    };
    const walletData2 = {
      address: '0x3',
      requests: {
        apiCalls: [fixtures.requests.createApiCall()],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 8,
    };

    let provider0 = fixtures.createEVMProviderState();
    let provider1 = fixtures.createEVMProviderState();
    let provider2 = fixtures.createEVMProviderState();

    provider0 = providerState.update(provider0, { walletDataByIndex: { 1: walletData0 } });
    provider1 = providerState.update(provider1, { walletDataByIndex: { 1: walletData1 } });
    provider2 = providerState.update(provider2, { walletDataByIndex: { 1: walletData2 } });

    const aggregatedApiCallsById = {
      apiCallId: [
        fixtures.createAggregatedApiCall({
          responseValue: '0x00000000000000000000000000000000000000000000000000000000000001b9',
        }),
      ],
    };

    let state = coordinatorState.create();
    state = coordinatorState.update(state, { aggregatedApiCallsById, EVMProviders: [provider0, provider1, provider2] });

    const [logs, res] = disaggregation.disaggregate(state);
    expect(logs).toEqual([]);
    expect(res[0].walletDataByIndex[1].requests.apiCalls[0].responseValue).toEqual(
      '0x00000000000000000000000000000000000000000000000000000000000001b9'
    );
    expect(res[1].walletDataByIndex[1].requests.apiCalls[0].responseValue).toEqual(
      '0x00000000000000000000000000000000000000000000000000000000000001b9'
    );
    expect(res[2].walletDataByIndex[1].requests.apiCalls[0].responseValue).toEqual(
      '0x00000000000000000000000000000000000000000000000000000000000001b9'
    );
  });

  // it('updates each request based on the provider(s) it was linked to', () => {
  //   const metadata = { blockNumber: 100, transactionHash: '0xa' };
  //   // The 2 calls are exactly the same, but are linked to different providers
  //   const walletData0 = {
  //     address: '0x1',
  //     requests: {
  //       apiCalls: [fixtures.requests.createApiCall({ metadata: { ...metadata, providerIndex: 0 } })],
  //       walletDesignations: [],
  //       withdrawals: [],
  //     },
  //     transactionCount: 2,
  //   };
  //   const walletData1 = {
  //     address: '0x2',
  //     requests: {
  //       apiCalls: [fixtures.requests.createApiCall({ metadata: { ...metadata, providerIndex: 1 } })],
  //       walletDesignations: [],
  //       withdrawals: [],
  //     },
  //     transactionCount: 5,
  //   };
  //
  //   const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
  //   let provider0 = providerState.create(config, 0);
  //   let provider1 = providerState.create(config, 1);
  //
  //   provider0 = providerState.update(provider0, { walletDataByIndex: { 2: walletData0 } });
  //   provider1 = providerState.update(provider1, { walletDataByIndex: { 3: walletData1 } });
  //
  //   const aggregatedApiCalls = [
  //     fixtures.createAggregatedApiCall({ providers: [0], response: { value: '0x123' } }),
  //     fixtures.createAggregatedApiCall({ providers: [1], error: { errorCode: RequestErrorCode.ApiCallFailed } }),
  //   ];
  //
  //   let state = coordinatorState.create();
  //   state = coordinatorState.update(state, { aggregatedApiCalls, providers: [provider0, provider1] });
  //
  //   const res = disaggregation.disaggregate(state);
  //   expect(res[0].walletDataByIndex[2].requests.apiCalls[0].response).toEqual({ value: '0x123' });
  //   expect(res[0].walletDataByIndex[2].requests.apiCalls[0].status).toEqual(RequestStatus.Pending);
  //   expect(res[0].walletDataByIndex[2].requests.apiCalls[0].errorCode).toEqual(undefined);
  //   expect(res[1].walletDataByIndex[3].requests.apiCalls[0].response).toEqual(undefined);
  //   expect(res[1].walletDataByIndex[3].requests.apiCalls[0].status).toEqual(RequestStatus.Errored);
  //   expect(res[1].walletDataByIndex[3].requests.apiCalls[0].errorCode).toEqual(RequestErrorCode.ApiCallFailed);
  // });
  //
  // it('does not update the request if the parameters are different', () => {
  //   const metadata = { blockNumber: 100, transactionHash: '0xa' };
  //   const walletData0 = {
  //     address: '0x1',
  //     requests: {
  //       apiCalls: [
  //         fixtures.requests.createApiCall({ parameters: { from: 'ETH' }, metadata: { ...metadata, providerIndex: 0 } }),
  //       ],
  //       walletDesignations: [],
  //       withdrawals: [],
  //     },
  //     transactionCount: 2,
  //   };
  //   const walletData1 = {
  //     address: '0x2',
  //     requests: {
  //       apiCalls: [
  //         fixtures.requests.createApiCall({ parameters: { from: 'BTC' }, metadata: { ...metadata, providerIndex: 1 } }),
  //       ],
  //       walletDesignations: [],
  //       withdrawals: [],
  //     },
  //     transactionCount: 5,
  //   };
  //
  //   const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
  //   let provider0 = providerState.create(config, 0);
  //   let provider1 = providerState.create(config, 1);
  //
  //   provider0 = providerState.update(provider0, { walletDataByIndex: { 1: walletData0 } });
  //   provider1 = providerState.update(provider1, { walletDataByIndex: { 1: walletData1 } });
  //
  //   const aggregatedApiCalls = [
  //     fixtures.createAggregatedApiCall({
  //       parameters: { from: 'BTC' },
  //       providers: [0, 1],
  //       response: { value: '0x123' },
  //     }),
  //   ];
  //
  //   let state = coordinatorState.create();
  //   state = coordinatorState.update(state, { aggregatedApiCalls, providers: [provider0, provider1] });
  //
  //   const res = disaggregation.disaggregate(state);
  //   expect(res[0].walletDataByIndex[1].requests.apiCalls[0].response).toEqual(undefined);
  //   expect(res[0].walletDataByIndex[1].requests.apiCalls[0].status).toEqual(RequestStatus.Blocked);
  //   expect(res[0].walletDataByIndex[1].requests.apiCalls[0].errorCode).toEqual(
  //     RequestErrorCode.UnableToMatchAggregatedCall
  //   );
  //   expect(res[1].walletDataByIndex[1].requests.apiCalls[0].response).toEqual({ value: '0x123' });
  //   expect(res[1].walletDataByIndex[1].requests.apiCalls[0].status).toEqual(RequestStatus.Pending);
  //   expect(res[1].walletDataByIndex[1].requests.apiCalls[0].errorCode).toEqual(undefined);
  // });
  //
  // it('does not update the request if the endpoint IDs are different', () => {
  //   const metadata = { blockNumber: 100, transactionHash: '0xa' };
  //   const walletData0 = {
  //     address: '0x1',
  //     requests: {
  //       apiCalls: [
  //         fixtures.requests.createApiCall({ endpointId: '0xunknown', metadata: { ...metadata, providerIndex: 0 } }),
  //       ],
  //       walletDesignations: [],
  //       withdrawals: [],
  //     },
  //     transactionCount: 2,
  //   };
  //   const walletData1 = {
  //     address: '0x2',
  //     requests: {
  //       apiCalls: [
  //         fixtures.requests.createApiCall({ endpointId: '0xendpointId', metadata: { ...metadata, providerIndex: 0 } }),
  //       ],
  //       walletDesignations: [],
  //       withdrawals: [],
  //     },
  //     transactionCount: 5,
  //   };
  //
  //   const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
  //   let provider0 = providerState.create(config, 0);
  //   let provider1 = providerState.create(config, 1);
  //
  //   provider0 = providerState.update(provider0, { walletDataByIndex: { 1: walletData0 } });
  //   provider1 = providerState.update(provider1, { walletDataByIndex: { 1: walletData1 } });
  //
  //   const aggregatedApiCalls = [
  //     fixtures.createAggregatedApiCall({
  //       endpointId: '0xendpointId',
  //       providers: [0, 1],
  //       response: { value: '0x123' },
  //     }),
  //   ];
  //
  //   let state = coordinatorState.create();
  //   state = coordinatorState.update(state, { aggregatedApiCalls, providers: [provider0, provider1] });
  //
  //   const res = disaggregation.disaggregate(state);
  //   expect(res[0].walletDataByIndex[1].requests.apiCalls[0].response).toEqual(undefined);
  //   expect(res[0].walletDataByIndex[1].requests.apiCalls[0].status).toEqual(RequestStatus.Blocked);
  //   expect(res[0].walletDataByIndex[1].requests.apiCalls[0].errorCode).toEqual(
  //     RequestErrorCode.UnableToMatchAggregatedCall
  //   );
  //   expect(res[1].walletDataByIndex[1].requests.apiCalls[0].response).toEqual({ value: '0x123' });
  //   expect(res[1].walletDataByIndex[1].requests.apiCalls[0].status).toEqual(RequestStatus.Pending);
  //   expect(res[1].walletDataByIndex[1].requests.apiCalls[0].errorCode).toEqual(undefined);
  // });
  //
  // it('does not update the request if the request IDs are different', () => {
  //   const metadata = { blockNumber: 100, transactionHash: '0xa' };
  //   const walletData0 = {
  //     address: '0x1',
  //     requests: {
  //       apiCalls: [fixtures.requests.createApiCall({ id: '0xunknown', metadata: { ...metadata, providerIndex: 0 } })],
  //       walletDesignations: [],
  //       withdrawals: [],
  //     },
  //     transactionCount: 2,
  //   };
  //   const walletData1 = {
  //     address: '0x2',
  //     requests: {
  //       apiCalls: [fixtures.requests.createApiCall({ id: '0xid', metadata: { ...metadata, providerIndex: 1 } })],
  //       walletDesignations: [],
  //       withdrawals: [],
  //     },
  //     transactionCount: 5,
  //   };
  //
  //   const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
  //   let provider0 = providerState.create(config, 0);
  //   let provider1 = providerState.create(config, 1);
  //
  //   provider0 = providerState.update(provider0, { walletDataByIndex: { 1: walletData0 } });
  //   provider1 = providerState.update(provider1, { walletDataByIndex: { 1: walletData1 } });
  //
  //   const aggregatedApiCalls = [
  //     fixtures.createAggregatedApiCall({
  //       id: '0xid',
  //       providers: [0, 1],
  //       error: { errorCode: RequestErrorCode.ApiCallFailed, message: 'Failed to call API' },
  //     }),
  //   ];
  //
  //   let state = coordinatorState.create();
  //   state = coordinatorState.update(state, { aggregatedApiCalls, providers: [provider0, provider1] });
  //
  //   const res = disaggregation.disaggregate(state);
  //   expect(res[0].walletDataByIndex[1].requests.apiCalls[0].response).toEqual(undefined);
  //   expect(res[0].walletDataByIndex[1].requests.apiCalls[0].status).toEqual(RequestStatus.Blocked);
  //   expect(res[0].walletDataByIndex[1].requests.apiCalls[0].errorCode).toEqual(
  //     RequestErrorCode.UnableToMatchAggregatedCall
  //   );
  //   expect(res[1].walletDataByIndex[1].requests.apiCalls[0].response).toEqual(undefined);
  //   expect(res[1].walletDataByIndex[1].requests.apiCalls[0].status).toEqual(RequestStatus.Errored);
  //   expect(res[1].walletDataByIndex[1].requests.apiCalls[0].errorCode).toEqual(RequestErrorCode.ApiCallFailed);
  // });
});
