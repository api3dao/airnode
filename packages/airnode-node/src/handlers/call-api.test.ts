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
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });
    const [logs, res] = await callApi({
      config: fixtures.buildConfig(),
      aggregatedApiCall,
    });
    expect(logs).toEqual([]);
    expect(res).toEqual({
      success: true,
      value: '0x0000000000000000000000000000000000000000000000000000000005f5e100',
      signature:
        '0x8df4fee3530c2a918ca0f8a295c3ae3ab849b30547548da5b7df7a8b69b70a753326afb7784ff1d99b732ccc2caf9171db8fc6ce5372afffd4d47c69c1e5828b1b',
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      {
        endpointName: 'convertToUSD',
        ois: fixtures.buildOIS(),
        parameters: { from: 'ETH' },
        metadata: {
          airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
          airnodeRrpAddress: '0x197F3826040dF832481f835652c290aC7c41f073',
          chainId: '31337',
          chainType: 'evm',
          endpointId: '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6',
          requestId: '0x1848c75378cb0f0c14c9255c6d7631aac3f1f236e502340b4a4dc0e184841153',
          requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
          sponsorAddress: '0x61648B2Ec3e6b3492E90184Ef281C2ba28a675ec',
          sponsorWalletAddress: '0x654B6d01E1A03eeF91F50D79203Ace648be81350',
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

  it('returns an error if the API call fails to execute', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockRejectedValueOnce(new Error('Network is down'));

    const parameters = { _type: 'int256', _path: 'unknown', from: 'ETH' };
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });
    const [logs, res] = await callApi({ config: fixtures.buildConfig(), aggregatedApiCall });
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Failed to call Endpoint:convertToUSD', error: new Error('Network is down') },
    ]);
    expect(res).toEqual({
      errorMessage: `${RequestErrorMessage.ApiCallFailed} with error: Network is down`,
      success: false,
    });
  });

  it('returns an error if the value cannot be found with the _path', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockResolvedValueOnce({ data: { price: 1000 } });
    const parameters = { _type: 'int256', _path: 'unknown', from: 'ETH' };
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });
    const [logs, res] = await callApi({ config: fixtures.buildConfig(), aggregatedApiCall });
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Unable to find response value from {"price":1000}. Path: unknown' },
    ]);
    expect(res).toEqual({
      errorMessage: RequestErrorMessage.ResponseValueNotFound,
      success: false,
    });
  });
});
