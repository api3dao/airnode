import { randomHexString } from '@api3/airnode-utilities';
import * as disaggregation from './disaggregation';
import * as fixtures from '../../../test/fixtures';
import * as coordinatorState from '../state';
import * as providerState from '../../providers/state';
import { GroupedRequests, RegularApiCallSuccessResponse, RequestErrorMessage } from '../../types';

describe('disaggregate - Requests', () => {
  fixtures.setEnvVariables({ AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey() });

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

    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCallWithResponse({
      data: {
        encodedValue: '0x00000000000000000000000000000000000000000000000000000000000001b9',
        signature: 'does-not-matter',
      },
    });
    const aggregatedApiCallsById = { apiCallId: aggregatedApiCall };

    const config = fixtures.buildConfig();
    const coordinatorId = randomHexString(16);
    const state = coordinatorState.create(config, coordinatorId);

    const providerStates = { evm: [mutableProvider0, mutableProvider1, mutableProvider2] };
    const stateWithResponses = coordinatorState.addResponses(state, { aggregatedApiCallsById, providerStates });

    const [logs, res] = disaggregation.disaggregate(stateWithResponses);
    expect(logs).toEqual([]);
    expect((res[0].requests.apiCalls[0] as any).data.encodedValue).toEqual(
      '0x00000000000000000000000000000000000000000000000000000000000001b9'
    );
    expect((res[1].requests.apiCalls[0] as any).data.encodedValue).toEqual(
      '0x00000000000000000000000000000000000000000000000000000000000001b9'
    );
    expect((res[2].requests.apiCalls[0] as any).data.encodedValue).toEqual(
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

    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCallWithResponse({
      id: 'btcCall',
      parameters: { from: 'BTC' },
      data: {
        encodedValue: '0x123',
        signature: 'does-not-matter',
      },
    });
    const aggregatedApiCallsById = { btcCall: aggregatedApiCall };

    const config = fixtures.buildConfig();
    const coordinatorId = randomHexString(16);
    const state = coordinatorState.create(config, coordinatorId);

    const providerStates = { evm: [mutableProvider0, mutableProvider1] };
    const stateWithResponses = coordinatorState.addResponses(state, { aggregatedApiCallsById, providerStates });

    const [logs, res] = disaggregation.disaggregate(stateWithResponses);
    expect(logs).toEqual([]);
    expect(res[0].requests.apiCalls.length).toEqual(0);
    expect((res[1].requests.apiCalls[0] as any as RegularApiCallSuccessResponse).data.encodedValue).toEqual('0x123');
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

    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCallWithResponse({
      errorMessage: RequestErrorMessage.ApiCallFailed,
      success: false,
    });
    const aggregatedApiCallsById = { apiCallId: aggregatedApiCall };

    const config = fixtures.buildConfig();
    const coordinatorId = randomHexString(16);
    const state = coordinatorState.create(config, coordinatorId);

    const providerStates = { evm: [mutableProvider0, mutableProvider1, mutableProvider2] };
    const stateWithResponses = coordinatorState.addResponses(state, {
      aggregatedApiCallsById,
      providerStates,
    });

    const [logs, res] = disaggregation.disaggregate(stateWithResponses);
    expect(logs).toEqual([]);
    expect(res[0].requests.apiCalls).toEqual([
      { ...apiCall, errorMessage: RequestErrorMessage.ApiCallFailed, success: false },
    ]);
    expect(res[1].requests.apiCalls).toEqual([
      { ...apiCall, errorMessage: RequestErrorMessage.ApiCallFailed, success: false },
    ]);
    expect(res[2].requests.apiCalls).toEqual([
      { ...apiCall, errorMessage: RequestErrorMessage.ApiCallFailed, success: false },
    ]);
  });
});
