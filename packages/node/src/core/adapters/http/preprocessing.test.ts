jest.mock('../../config', () => ({
  config: {
    triggers: {
      requests: [{ endpointId: 'endpointId', endpointName: 'endpointName', oisTitle: 'oisTitle' }],
    },
    ois: [fixtures.ois],
  },
}));

import * as fixtures from 'test/fixtures';
import * as preprocessing from './preprocessing';
import { RequestErrorCode } from '../../../types';

describe('validateAggregatedApiCall', () => {
  it('returns no errors if the aggregated API call is valid', () => {
    const aggCall = fixtures.createAggregatedApiCall();
    const [logs, res] = preprocessing.validateAggregatedApiCall(aggCall);
    expect(logs).toEqual([]);
    expect(res).toEqual(aggCall);
  });

  it('returns an error if the OIS cannot be found', () => {
    const aggCall = fixtures.createAggregatedApiCall({ oisTitle: 'unknownOIS' });
    const [logs, res] = preprocessing.validateAggregatedApiCall(aggCall);
    expect(logs).toEqual([{ level: 'ERROR', message: 'Unknown OIS:unknownOIS received for Request:apiCallId' }]);
    expect(res).toEqual({ ...aggCall, errorCode: RequestErrorCode.UnknownOIS });
  });

  it('returns an error if the Endpoint cannot be found', () => {
    const aggCall = fixtures.createAggregatedApiCall({ endpointName: 'unknownEndpoint' });
    const [logs, res] = preprocessing.validateAggregatedApiCall(aggCall);
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Unknown Endpoint:unknownEndpoint in OIS:oisTitle received for Request:apiCallId' },
    ]);
    expect(res).toEqual({ ...aggCall, errorCode: RequestErrorCode.UnknownEndpoint });
  });
});
