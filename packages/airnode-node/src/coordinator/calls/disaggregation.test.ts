import * as disaggregation from './disaggregation';
import * as fixtures from '../../../test/fixtures';
import * as coordinatorState from '../state';
import * as providerState from '../../providers/state';
import { GroupedRequests, RequestErrorMessage } from '../../types';

describe('disaggregate - Requests', () => {
  it('maps aggregated responses back to requests for each provider', () => {
    const requests: GroupedRequests = {
      apiCalls: [fixtures.requests.buildApiCall()],
      withdrawals: [],
    };

    let mutableProvider0 = fixtures.buildEVMProviderState();
    let mutableProvider1 = fixtures.buildEVMProviderState();
    let mutableProvider2 = fixtures.buildEVMProviderState();

    mutableProvider0 = providerState.update(mutableProvider0, { requests });
    mutableProvider1 = providerState.update(mutableProvider1, { requests });
    mutableProvider2 = providerState.update(mutableProvider2, { requests });

    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({
      responseValue: '0x00000000000000000000000000000000000000000000000000000000000001b9',
    });
    const aggregatedApiCallsById = { apiCallId: aggregatedApiCall };

    const config = fixtures.buildConfig();
    let mutableState = coordinatorState.create(config);

    const providerStates = { evm: [mutableProvider0, mutableProvider1, mutableProvider2] };
    mutableState = coordinatorState.update(mutableState, { aggregatedApiCallsById, providerStates });

    const [logs, res] = disaggregation.disaggregate(mutableState);
    expect(logs).toEqual([]);
    expect(res[0].requests.apiCalls[0].responseValue).toEqual(
      '0x00000000000000000000000000000000000000000000000000000000000001b9'
    );
    expect(res[1].requests.apiCalls[0].responseValue).toEqual(
      '0x00000000000000000000000000000000000000000000000000000000000001b9'
    );
    expect(res[2].requests.apiCalls[0].responseValue).toEqual(
      '0x00000000000000000000000000000000000000000000000000000000000001b9'
    );
  });

  it('drops the request if the parameters are different', () => {
    const requests0: GroupedRequests = {
      apiCalls: [fixtures.requests.buildApiCall({ id: 'ethCall', parameters: { from: 'ETH' } })],
      withdrawals: [],
    };
    const requests1: GroupedRequests = {
      apiCalls: [fixtures.requests.buildApiCall({ id: 'btcCall', parameters: { from: 'BTC' } })],
      withdrawals: [],
    };

    let mutableProvider0 = fixtures.buildEVMProviderState();
    let mutableProvider1 = fixtures.buildEVMProviderState();

    mutableProvider0 = providerState.update(mutableProvider0, { requests: requests0 });
    mutableProvider1 = providerState.update(mutableProvider1, { requests: requests1 });

    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({
      id: 'btcCall',
      parameters: { from: 'BTC' },
      responseValue: '0x123',
    });
    const aggregatedApiCallsById = { btcCall: aggregatedApiCall };

    const config = fixtures.buildConfig();
    let mutableState = coordinatorState.create(config);

    const providerStates = { evm: [mutableProvider0, mutableProvider1] };
    mutableState = coordinatorState.update(mutableState, { aggregatedApiCallsById, providerStates });

    const [logs, res] = disaggregation.disaggregate(mutableState);
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Unable to find matching aggregated API calls for Request:ethCall' },
    ]);
    expect(res[0].requests.apiCalls.length).toEqual(0);
    expect(res[1].requests.apiCalls[0].responseValue).toEqual('0x123');
    expect(res[1].requests.apiCalls[0].errorMessage).toEqual(undefined);
  });

  it('drops errored requests', () => {
    const apiCall = fixtures.requests.buildApiCall();
    const requests: GroupedRequests = { apiCalls: [apiCall], withdrawals: [] };

    let mutableProvider0 = fixtures.buildEVMProviderState();
    let mutableProvider1 = fixtures.buildEVMProviderState();
    let mutableProvider2 = fixtures.buildEVMProviderState();

    mutableProvider0 = providerState.update(mutableProvider0, { requests });
    mutableProvider1 = providerState.update(mutableProvider1, { requests });
    mutableProvider2 = providerState.update(mutableProvider2, { requests });

    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({
      errorMessage: RequestErrorMessage.ApiCallFailed,
    });
    const aggregatedApiCallsById = { apiCallId: aggregatedApiCall };

    const config = fixtures.buildConfig();
    let mutableState = coordinatorState.create(config);

    const providerStates = { evm: [mutableProvider0, mutableProvider1, mutableProvider2] };
    mutableState = coordinatorState.update(mutableState, { aggregatedApiCallsById, providerStates });

    const [logs, res] = disaggregation.disaggregate(mutableState);
    expect(logs).toEqual([]);
    expect(res[0].requests.apiCalls).toEqual([{ ...apiCall, errorMessage: RequestErrorMessage.ApiCallFailed }]);
    expect(res[1].requests.apiCalls).toEqual([{ ...apiCall, errorMessage: RequestErrorMessage.ApiCallFailed }]);
    expect(res[2].requests.apiCalls).toEqual([{ ...apiCall, errorMessage: RequestErrorMessage.ApiCallFailed }]);
  });
});
