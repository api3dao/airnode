import * as adapter from '@api3/airnode-adapter';
import { callApi } from './call-api';
import { RequestErrorMessage } from '../types';
import * as fixtures from '../../test/fixtures';

describe('callApi', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('calls the adapter with the given parameters', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockResolvedValueOnce({ data: { price: 1000 } });
    const parameters = { _type: 'int256', _path: 'price', from: 'ETH' };
    const aggregatedApiCall = fixtures.buildAggregatedApiCall({ parameters });
    const [logs, res] = await callApi({
      config: fixtures.buildConfig(),
      aggregatedApiCall,
      apiCallOptions: {},
    });
    expect(logs).toEqual([]);
    expect(res).toEqual({
      value: '0x0000000000000000000000000000000000000000000000000000000005f5e100',
      signature:
        '0x4d7f431100977a335667c36d1a47b242707c958304bf218f2fbbfdd840eef50765fcf16b8230351fb2bb79dbb099040e617b5e9c72642033b61a83c403fa68a41b',
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      {
        endpointName: 'convertToUSD',
        ois: fixtures.buildOIS(),
        parameters: { from: 'ETH' },
        metadata: {
          airnodeAddress: '0xa30ca71ba54e83127214d3271aea8f5d6bd4dace',
          airnodeRrpAddress: '0x197F3826040dF832481f835652c290aC7c41f073',
          chainId: '31337',
          chainType: 'evm',
          endpointId: 'endpointId',
          requestId: '0xb56b66dc089eab3dc98672ea5e852488730a8f76621fd9ea719504ea205980f8',
          requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
          sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
          sponsorWalletAddress: '0x15c2D488bE806Ee769078Cceec00E57a9f2009E1',
        },
        apiCredentials: [
          {
            securitySchemeName: 'My Security Scheme',
            securitySchemeValue: 'supersecret',
          },
        ],
      },
      { timeout: 10_000 }
    );
  });

  it('returns an error if no _type parameter is found', async () => {
    const aggregatedApiCall = fixtures.buildAggregatedApiCall();
    const [logs, res] = await callApi({ config: fixtures.buildConfig(), aggregatedApiCall, apiCallOptions: {} });
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: "No '_type' parameter was found for Endpoint:convertToUSD, OIS:Currency Converter API",
      },
    ]);
    expect(res).toEqual({
      errorMessage: `${RequestErrorMessage.ReservedParametersInvalid}: _type is missing for endpoint convertToUSD`,
    });
  });

  it('returns an error if the API call fails to execute', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockRejectedValueOnce(new Error('Network is down'));

    const parameters = { _type: 'int256', _path: 'unknown', from: 'ETH' };
    const aggregatedApiCall = fixtures.buildAggregatedApiCall({ parameters });
    const [logs, res] = await callApi({ config: fixtures.buildConfig(), aggregatedApiCall, apiCallOptions: {} });
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Failed to call Endpoint:convertToUSD', error: new Error('Network is down') },
    ]);
    expect(res).toEqual({
      errorMessage: `${RequestErrorMessage.ApiCallFailed} with error: Network is down`,
    });
  });

  it('returns an error if the value cannot be found with the _path', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockResolvedValueOnce({ data: { price: 1000 } });
    const parameters = { _type: 'int256', _path: 'unknown', from: 'ETH' };
    const aggregatedApiCall = fixtures.buildAggregatedApiCall({ parameters });
    const [logs, res] = await callApi({ config: fixtures.buildConfig(), aggregatedApiCall, apiCallOptions: {} });
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Unable to find response value from {"price":1000}. Path: unknown' },
    ]);
    expect(res).toEqual({
      errorMessage: RequestErrorMessage.ResponseValueNotFound,
    });
  });
});
