import * as disaggregation from './disaggregation';
import * as fixtures from '../../../test/fixtures';
import * as coordinatorState from '../state';
import * as providerState from '../../providers/state';
import { GroupedRequests, RequestErrorCode, RequestStatus } from '../../types';

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

    const aggregatedApiCall = fixtures.buildAggregatedApiCall({
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

  it('does not update the request if the parameters are different', () => {
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

    const aggregatedApiCall = fixtures.buildAggregatedApiCall({
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
    expect(res[0].requests.apiCalls[0].responseValue).toEqual(undefined);
    expect(res[0].requests.apiCalls[0].status).toEqual(RequestStatus.Blocked);
    expect(res[0].requests.apiCalls[0].errorCode).toEqual(RequestErrorCode.NoMatchingAggregatedCall);
    expect(res[1].requests.apiCalls[0].responseValue).toEqual('0x123');
    expect(res[1].requests.apiCalls[0].status).toEqual(RequestStatus.Pending);
    expect(res[1].requests.apiCalls[0].errorCode).toEqual(undefined);
  });

  it('does not update API calls if the status is not pending', () => {
    const apiCall = fixtures.requests.buildApiCall({
      status: RequestStatus.Errored,
      errorCode: RequestErrorCode.Unauthorized,
    });
    const requests: GroupedRequests = { apiCalls: [apiCall], withdrawals: [] };

    let mutableProvider0 = fixtures.buildEVMProviderState();
    mutableProvider0 = providerState.update(mutableProvider0, { requests });

    const aggregatedApiCall = fixtures.buildAggregatedApiCall({
      responseValue: '0x00000000000000000000000000000000000000000000000000000000000001b9',
    });
    const aggregatedApiCallsById = { apiCallId: aggregatedApiCall };

    const config = fixtures.buildConfig();
    let mutableState = coordinatorState.create(config);

    const providerStates = { evm: [mutableProvider0] };
    mutableState = coordinatorState.update(mutableState, { aggregatedApiCallsById, providerStates });

    const [logs, res] = disaggregation.disaggregate(mutableState);
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message: `Not applying response value to Request:${apiCall.id} as it has status:${apiCall.status}`,
      },
    ]);
    expect(res[0].requests.apiCalls).toEqual([apiCall]);
  });

  it('applies the error code to each individual request', () => {
    const apiCall = fixtures.requests.buildApiCall();
    const requests: GroupedRequests = { apiCalls: [apiCall], withdrawals: [] };

    let mutableProvider0 = fixtures.buildEVMProviderState();
    let mutableProvider1 = fixtures.buildEVMProviderState();
    let mutableProvider2 = fixtures.buildEVMProviderState();

    mutableProvider0 = providerState.update(mutableProvider0, { requests });
    mutableProvider1 = providerState.update(mutableProvider1, { requests });
    mutableProvider2 = providerState.update(mutableProvider2, { requests });

    const aggregatedApiCall = fixtures.buildAggregatedApiCall({ errorCode: RequestErrorCode.ApiCallFailed });
    const aggregatedApiCallsById = { apiCallId: aggregatedApiCall };

    const config = fixtures.buildConfig();
    let mutableState = coordinatorState.create(config);

    const providerStates = { evm: [mutableProvider0, mutableProvider1, mutableProvider2] };
    mutableState = coordinatorState.update(mutableState, { aggregatedApiCallsById, providerStates });

    const [logs, res] = disaggregation.disaggregate(mutableState);
    expect(logs).toEqual([]);
    expect(res[0].requests.apiCalls).toEqual([
      { ...apiCall, errorCode: RequestErrorCode.ApiCallFailed, status: RequestStatus.Errored },
    ]);
    expect(res[1].requests.apiCalls).toEqual([
      { ...apiCall, errorCode: RequestErrorCode.ApiCallFailed, status: RequestStatus.Errored },
    ]);
    expect(res[2].requests.apiCalls).toEqual([
      { ...apiCall, errorCode: RequestErrorCode.ApiCallFailed, status: RequestStatus.Errored },
    ]);
  });
});
