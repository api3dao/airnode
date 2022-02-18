import * as adapter from '@api3/airnode-adapter';
import { RequestErrorMessage } from '../types';
import * as fixtures from '../../test/fixtures';
import { callApi } from '.';

describe('callApi', () => {
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
        '0xe92f5ee40ddb5aa42cab65fcdc025008b2bc026af80a7c93a9aac4e474f8a88f4f2bd861b9cf9a2b050bf0fd13e9714c4575cebbea658d7501e98c0963a5a38b1c',
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
          requestId: '0xf40127616f09d41b20891bcfd326957a0e3d5a5ecf659cff4d8106c04b024374',
          requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
          sponsorAddress: '0x2479808b1216E998309A727df8A0A98A1130A162',
          sponsorWalletAddress: '0x1C1CEEF1a887eDeAB20219889971e1fd4645b55D',
        },
        apiCredentials: [
          {
            securitySchemeName: 'My Security Scheme',
            securitySchemeValue: 'supersecret',
          },
        ],
      },
      { timeout: 30_000 }
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
      errorMessage: `${RequestErrorMessage.ApiCallFailed}`,
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
      { level: 'ERROR', message: `Unable to find response value from {"price":1000}. Path: 'unknown'` },
    ]);
    expect(res).toEqual({
      errorMessage: `Unable to find response value from {"price":1000}. Path: 'unknown'`,
      success: false,
    });
  });

  it('returns an error if the value encoding fails', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockResolvedValueOnce({ data: { price: -1000 } });
    const parameters = { _type: 'uint256', _path: 'price', from: 'ETH' };
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });
    const [logs, res] = await callApi({
      config: fixtures.buildConfig(),
      aggregatedApiCall,
    });
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: 'value out-of-bounds (argument=null, value="-100000000", code=INVALID_ARGUMENT, version=abi/5.5.0)',
      },
    ]);
    expect(res).toEqual({
      errorMessage: 'value out-of-bounds (argument=null, value="-100000000", code=INVALID_ARGUMENT, version=abi/5.5.0)',
      success: false,
    });
  });

  it('returns an error if the parameter type is invalid', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockResolvedValueOnce({ data: { price: '1000' } });
    const parameters = { _type: 'string', _path: 'price', from: 'ETH', test: 'new' };
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });
    const [logs, res] = await callApi({
      config: fixtures.buildConfig(),
      aggregatedApiCall,
    });
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: `Parameter "_times" can only be used with numeric types, but "_type" was "${parameters._type}"`,
      },
    ]);
    expect(res).toEqual({
      errorMessage: `Parameter "_times" can only be used with numeric types, but "_type" was "${parameters._type}"`,
      success: false,
    });
  });

  it('returns an error if the parameter type cannot be converted', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockResolvedValueOnce({ data: { price: 'string' } });
    const parameters = { _type: 'int256', _path: 'price', from: 'ETH', test: 'new' };
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });
    const [logs, res] = await callApi({
      config: fixtures.buildConfig(),
      aggregatedApiCall,
    });
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: `Unable to convert: 'string' to 'int256'. Reason: Invalid number value`,
      },
    ]);
    expect(res).toEqual({
      errorMessage: `Unable to convert: 'string' to 'int256'. Reason: Invalid number value`,
      success: false,
    });
  });
});
