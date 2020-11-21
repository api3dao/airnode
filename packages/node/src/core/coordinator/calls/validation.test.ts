import orderBy from 'lodash/orderBy';
import * as fixtures from 'test/fixtures';
import * as validation from './validation';
import { RequestErrorCode } from '../../../types';

describe('validateAggregatedApiCall', () => {
  it('returns no errors if the aggregated API call is valid', () => {
    const aggCall = fixtures.createAggregatedApiCall();
    const [logs, res] = validation.validateAggregatedApiCall(fixtures.buildConfig(), aggCall);
    expect(logs).toEqual([]);
    expect(res).toEqual(aggCall);
  });

  it('returns an error if the OIS cannot be found', () => {
    const aggCall = fixtures.createAggregatedApiCall({ oisTitle: 'unknownOIS' });
    const [logs, res] = validation.validateAggregatedApiCall(fixtures.buildConfig(), aggCall);
    expect(logs).toEqual([{ level: 'ERROR', message: 'Unknown OIS:unknownOIS received for Request:apiCallId' }]);
    expect(res).toEqual({ ...aggCall, errorCode: RequestErrorCode.UnknownOIS });
  });

  it('returns an error if the Endpoint cannot be found', () => {
    const aggCall = fixtures.createAggregatedApiCall({ endpointName: 'unknownEndpoint' });
    const [logs, res] = validation.validateAggregatedApiCall(fixtures.buildConfig(), aggCall);
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Unknown Endpoint:unknownEndpoint in OIS:oisTitle received for Request:apiCallId' },
    ]);
    expect(res).toEqual({ ...aggCall, errorCode: RequestErrorCode.UnknownEndpoint });
  });
});

describe('validateAggregatedApiCalls', () => {
  it('validates multiple aggregated API calls', () => {
    const valid = fixtures.createAggregatedApiCall({ id: '0x1' });
    const unknownOIS = fixtures.createAggregatedApiCall({ id: '0x2', oisTitle: 'unknownOIS' });
    const unknownEndpoint = fixtures.createAggregatedApiCall({ id: '0x3', endpointName: 'unknownEndpoint' });
    const aggregatedApiCallsById = {
      '0x1': valid,
      '0x2': unknownOIS,
      '0x3': unknownEndpoint,
    };
    const [logs, res] = validation.validateAggregatedApiCalls(fixtures.buildConfig(), aggregatedApiCallsById);
    expect(orderBy(logs, ['message'])).toEqual(
      orderBy(
        [
          { level: 'ERROR', message: `Unknown OIS:unknownOIS received for Request:${unknownOIS.id}` },
          {
            level: 'ERROR',
            message: `Unknown Endpoint:unknownEndpoint in OIS:oisTitle received for Request:${unknownEndpoint.id}`,
          },
        ],
        ['message']
      )
    );
    expect(res['0x1']).toEqual(valid);
    expect(res['0x2']).toEqual({ ...unknownOIS, errorCode: RequestErrorCode.UnknownOIS });
    expect(res['0x3']).toEqual({ ...unknownEndpoint, errorCode: RequestErrorCode.UnknownEndpoint });
  });
});
