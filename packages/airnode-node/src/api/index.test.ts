import * as adapter from '@api3/airnode-adapter';
import { ethers } from 'ethers';
import { ApiCallErrorResponse, RequestErrorMessage } from '../types';
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
      data: {
        encodedValue: '0x0000000000000000000000000000000000000000000000000000000005f5e100',
        signature:
          '0xe92f5ee40ddb5aa42cab65fcdc025008b2bc026af80a7c93a9aac4e474f8a88f4f2bd861b9cf9a2b050bf0fd13e9714c4575cebbea658d7501e98c0963a5a38b1c',
      },
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
    expect(logs).toEqual([{ level: 'ERROR', message: `Unable to find value at path: 'unknown'` }]);
    expect(res).toEqual({
      errorMessage: `Unable to find value at path: 'unknown'`,
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

    expect(logs[0].level).toEqual('ERROR');
    expect(logs[0].message).toContain('value out-of-bounds');

    const { errorMessage, success } = res as ApiCallErrorResponse;

    expect(errorMessage).toContain('value out-of-bounds');
    expect(success).toEqual(false);
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
        message: `Unable to cast value to int256`,
      },
    ]);
    expect(res).toEqual({
      errorMessage: `Unable to cast value to int256`,
      success: false,
    });
  });

  describe('pre-processing', () => {
    const createEncodedValue = (value: ethers.BigNumber, times = 100_000) =>
      `0x${value.mul(times).toHexString().substring(2).padStart(64, '0')}`;

    it('pre-processes parameters - valid processing code', async () => {
      const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
      spy.mockResolvedValueOnce({ data: { price: 123 } });
      const parameters = { _type: 'int256', _path: 'price', from: 'TBD' };
      const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });
      const config = fixtures.buildConfig();
      const preProcessingSpecifications = [
        {
          environment: 'Node 14' as const,
          value: 'const output = {...input, from: "BTC"};',
        },
        {
          environment: 'Node 14' as const,
          value: 'const output = {...input, source: "airnode"};',
        },
      ];
      config.ois[0].endpoints[0] = { ...config.ois[0].endpoints[0], preProcessingSpecifications };

      const [logs, res] = await callApi({
        config,
        aggregatedApiCall,
      });

      expect(logs).toEqual([]);
      expect(res).toEqual({
        success: true,
        data: {
          encodedValue: createEncodedValue(ethers.BigNumber.from(123)),
          signature:
            '0xf884749942af38ef69735fcbabd1a521f7ac3b87e9988f1a57bdba10cca57f811fd43492aace34674c374a26518855c33bfb322bf5a567bac65453e67c0a4e401c',
        },
      });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: { from: 'BTC', source: 'airnode' },
        }),
        { timeout: 30_000 }
      );
    });

    it('post-processes parameters - valid processing code', async () => {
      const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
      spy.mockResolvedValueOnce({ data: { price: 123 } });
      const parameters = { _type: 'int256', _path: '', from: 'ETH' };
      const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });
      const config = fixtures.buildConfig();
      const postProcessingSpecifications = [
        {
          environment: 'Node 14' as const,
          value: 'const output = parseInt(input.price)*1000;',
        },
        {
          environment: 'Node 14' as const,
          value: 'const output = parseInt(input)*2;',
        },
      ];
      config.ois[0].endpoints[0] = { ...config.ois[0].endpoints[0], postProcessingSpecifications };

      const [logs, res] = await callApi({
        config,
        aggregatedApiCall,
      });

      expect(logs).toEqual([]);
      expect(res).toEqual({
        success: true,
        data: {
          encodedValue: createEncodedValue(ethers.BigNumber.from(123 * 1000 * 2)),
          signature:
            '0xb32600a43cf9f93445c9fb478ba355efa773e841b498c61218ed1a5a81a43e3d0ade6fb1a0083506c7ab3426bce45dd92d6198c136a80cdfacde839f3fcf5c8a1b',
        },
      });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: { from: 'ETH' },
        }),
        { timeout: 30_000 }
      );
    });
  });
});
