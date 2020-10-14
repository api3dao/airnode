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
import { AggregatedApiCallsById, RequestErrorCode, RequestStatus } from 'src/types';

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

    const settings = fixtures.createNodeSettings();
    let state = coordinatorState.create(settings);
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

  it('does not update the request if the parameters are different', () => {
    const walletData0 = {
      address: '0x1',
      requests: {
        apiCalls: [fixtures.requests.createApiCall({ id: 'ethCall', parameters: { from: 'ETH' } })],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 2,
    };
    const walletData1 = {
      address: '0x2',
      requests: {
        apiCalls: [fixtures.requests.createApiCall({ id: 'btcCall', parameters: { from: 'BTC' } })],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 5,
    };

    let provider0 = fixtures.createEVMProviderState();
    let provider1 = fixtures.createEVMProviderState();

    provider0 = providerState.update(provider0, { walletDataByIndex: { 1: walletData0 } });
    provider1 = providerState.update(provider1, { walletDataByIndex: { 1: walletData1 } });

    const aggregatedApiCallsById: AggregatedApiCallsById = {
      btcCall: [
        fixtures.createAggregatedApiCall({ id: 'btcCall', parameters: { from: 'BTC' }, responseValue: '0x123' }),
      ],
    };

    const settings = fixtures.createNodeSettings();
    let state = coordinatorState.create(settings);
    state = coordinatorState.update(state, { aggregatedApiCallsById, EVMProviders: [provider0, provider1] });

    const [logs, res] = disaggregation.disaggregate(state);
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Unable to find matching aggregated API calls for Request:ethCall' },
    ]);
    expect(res[0].walletDataByIndex[1].requests.apiCalls[0].responseValue).toEqual(undefined);
    expect(res[0].walletDataByIndex[1].requests.apiCalls[0].status).toEqual(RequestStatus.Blocked);
    expect(res[0].walletDataByIndex[1].requests.apiCalls[0].errorCode).toEqual(
      RequestErrorCode.UnableToMatchAggregatedCall
    );
    expect(res[1].walletDataByIndex[1].requests.apiCalls[0].responseValue).toEqual('0x123');
    expect(res[1].walletDataByIndex[1].requests.apiCalls[0].status).toEqual(RequestStatus.Pending);
    expect(res[1].walletDataByIndex[1].requests.apiCalls[0].errorCode).toEqual(undefined);
  });

  it('does not update the request if the endpoint IDs are different', () => {
    const walletData0 = {
      address: '0x1',
      requests: {
        apiCalls: [fixtures.requests.createApiCall({ endpointId: '0xunknown' })],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 2,
    };
    const walletData1 = {
      address: '0x2',
      requests: {
        apiCalls: [fixtures.requests.createApiCall({ endpointId: '0xendpointId' })],
        walletDesignations: [],
        withdrawals: [],
      },
      transactionCount: 5,
    };

    let provider0 = fixtures.createEVMProviderState();
    let provider1 = fixtures.createEVMProviderState();

    provider0 = providerState.update(provider0, { walletDataByIndex: { 1: walletData0 } });
    provider1 = providerState.update(provider1, { walletDataByIndex: { 1: walletData1 } });

    const aggregatedApiCallsById: AggregatedApiCallsById = {
      apiCallId: [fixtures.createAggregatedApiCall({ endpointId: '0xendpointId', responseValue: '0x123' })],
    };

    const settings = fixtures.createNodeSettings();
    let state = coordinatorState.create(settings);
    state = coordinatorState.update(state, { aggregatedApiCallsById, EVMProviders: [provider0, provider1] });

    const [logs, res] = disaggregation.disaggregate(state);
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Unable to find matching aggregated API call for Request:apiCallId' },
    ]);
    expect(res[0].walletDataByIndex[1].requests.apiCalls[0].responseValue).toEqual(undefined);
    expect(res[0].walletDataByIndex[1].requests.apiCalls[0].status).toEqual(RequestStatus.Blocked);
    expect(res[0].walletDataByIndex[1].requests.apiCalls[0].errorCode).toEqual(
      RequestErrorCode.UnableToMatchAggregatedCall
    );
    expect(res[1].walletDataByIndex[1].requests.apiCalls[0].responseValue).toEqual('0x123');
    expect(res[1].walletDataByIndex[1].requests.apiCalls[0].status).toEqual(RequestStatus.Pending);
    expect(res[1].walletDataByIndex[1].requests.apiCalls[0].errorCode).toEqual(undefined);
  });
});
