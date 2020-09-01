jest.mock('../config', () => ({
  config: {
    triggers: {
      requests: [{ endpointId: 'endpointId', endpointName: 'endpointName', oisTitle: 'oisTitle' }],
    },
    ois: [
      {
        title: 'oisTitle',
        endpoints: [{ name: 'endpointName' }],
      },
    ],
  },
}));

import * as fixtures from 'test/fixtures';
import * as preprocessor from './preprocessor';
import { CoordinatorState, RequestErrorCode } from '../../types';

describe('validateAggregatedApiCall', () => {
  it('returns no errors if the aggregated API call is valid', () => {
    const aggCall = fixtures.createAggregatedApiCall();
    const res = preprocessor.validateAggregatedApiCall(aggCall);
    expect(res.error).toEqual(undefined);
  });

  it('returns an error if the OIS cannot be found', () => {
    const aggCall = fixtures.createAggregatedApiCall({ oisTitle: 'unknownOIS' });
    const res = preprocessor.validateAggregatedApiCall(aggCall);
    expect(res.error).toEqual({
      errorCode: RequestErrorCode.UnknownOIS,
      message: 'Unknown OIS:unknownOIS received for Request:apiCallId',
    });
  });

  it('returns an error if the Endpoint cannot be found', () => {
    const aggCall = fixtures.createAggregatedApiCall({ endpointName: 'unknownEndpoint' });
    const res = preprocessor.validateAggregatedApiCall(aggCall);
    expect(res.error).toEqual({
      errorCode: RequestErrorCode.UnknownEndpoint,
      message: 'Unknown Endpoint:unknownEndpoint in OIS:oisTitle received for Request:apiCallId',
    });
  });
});

describe('validateAllAggregatedCalls', () => {
  it('validates each aggregated API call', () => {
    const state: CoordinatorState = {
      aggregatedApiCalls: [
        fixtures.createAggregatedApiCall({ oisTitle: 'unknownOIS' }),
        fixtures.createAggregatedApiCall({ endpointName: 'unknownEndpoint' }),
      ],
      providers: [],
    };
    const res = preprocessor.validateAllAggregatedCalls(state);
    expect(res[0].error).toEqual({
      errorCode: RequestErrorCode.UnknownOIS,
      message: 'Unknown OIS:unknownOIS received for Request:apiCallId',
    });
    expect(res[1].error).toEqual({
      errorCode: RequestErrorCode.UnknownEndpoint,
      message: 'Unknown Endpoint:unknownEndpoint in OIS:oisTitle received for Request:apiCallId',
    });
  });
});
