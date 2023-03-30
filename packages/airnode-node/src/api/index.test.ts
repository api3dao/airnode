import * as adapter from '@api3/airnode-adapter';
import { ethers } from 'ethers';
import { AxiosError, AxiosHeaders } from 'axios';
import * as fixtures from '../../test/fixtures';
import { getExpectedTemplateIdV0 } from '../evm/templates';
import { ApiCallErrorResponse, RequestErrorMessage } from '../types';
import { FIRST_API_CALL_TIMEOUT, SECOND_API_CALL_TIMEOUT } from '../constants';
import { callApi, verifyTemplateId } from '.';

describe('callApi', () => {
  fixtures.setEnvVariables({ AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey() });

  it('calls the adapter with the given parameters', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockResolvedValueOnce({ data: { price: 1000 } });
    const requestedGasPrice = '100000000';
    const requestedMinConfirmations = '0';
    const parameters = {
      _type: 'int256',
      _path: 'price',
      from: 'ETH',
      _gasPrice: requestedGasPrice,
      _minConfirmations: requestedMinConfirmations,
    };

    const [logs, res] = await callApi({
      type: 'regular',
      config: fixtures.buildConfig(),
      aggregatedApiCall: fixtures.buildAggregatedRegularApiCall({ parameters }),
    });

    expect(logs).toEqual([]);
    expect(res).toEqual({
      success: true,
      data: {
        encodedValue: '0x0000000000000000000000000000000000000000000000000000000005f5e100',
        signature:
          '0xe92f5ee40ddb5aa42cab65fcdc025008b2bc026af80a7c93a9aac4e474f8a88f4f2bd861b9cf9a2b050bf0fd13e9714c4575cebbea658d7501e98c0963a5a38b1c',
      },
      // _minConfirmations is processed before making API calls
      reservedParameterOverrides: {
        gasPrice: requestedGasPrice,
      },
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      {
        endpointName: 'convertToUSD',
        ois: fixtures.buildOIS(),
        parameters: { from: 'ETH', amount: '1' },
        metadata: {
          chainId: '31337',
          chainType: 'evm',
          requestId: '0xf40127616f09d41b20891bcfd326957a0e3d5a5ecf659cff4d8106c04b024374',
          requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
          sponsorAddress: '0x2479808b1216E998309A727df8A0A98A1130A162',
          sponsorWalletAddress: '0x1C1CEEF1a887eDeAB20219889971e1fd4645b55D',
        },
        apiCredentials: [
          {
            securitySchemeName: 'myApiSecurityScheme',
            securitySchemeValue: 'supersecret',
          },
        ],
      },
      { timeout: FIRST_API_CALL_TIMEOUT }
    );
  });

  it('calls the adapter with the given parameters even if config.chains cannot be found', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockResolvedValueOnce({ data: { price: 1000 } });
    const parameters = { _type: 'int256', _path: 'price', from: 'ETH' };

    const [logs, res] = await callApi({
      type: 'regular',
      config: fixtures.buildConfig({ chains: [] }),
      aggregatedApiCall: fixtures.buildAggregatedRegularApiCall({ parameters }),
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
        parameters: { from: 'ETH', amount: '1' },
        metadata: {
          chainId: '31337',
          chainType: 'evm',
          requestId: '0xf40127616f09d41b20891bcfd326957a0e3d5a5ecf659cff4d8106c04b024374',
          requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
          sponsorAddress: '0x2479808b1216E998309A727df8A0A98A1130A162',
          sponsorWalletAddress: '0x1C1CEEF1a887eDeAB20219889971e1fd4645b55D',
        },
        apiCredentials: [
          {
            securitySchemeName: 'myApiSecurityScheme',
            securitySchemeValue: 'supersecret',
          },
        ],
      },
      { timeout: FIRST_API_CALL_TIMEOUT }
    );
  });

  it('calls the adapter with the given parameters with when request type is http-gateway and config just has ois and apiCredentials props', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockResolvedValueOnce({ data: { price: 1000 } });
    const parameters = { _type: 'int256', _path: 'price', from: 'ETH' };

    const [logs, res] = await callApi({
      type: 'http-gateway',
      config: { ois: [fixtures.buildOIS()], apiCredentials: [fixtures.buildApiCredentials()] },
      aggregatedApiCall: fixtures.buildAggregatedHttpGatewayApiCall({ parameters }),
    });

    expect(logs).toEqual([]);
    expect(res).toEqual({
      success: true,
      data: {
        encodedValue: '0x0000000000000000000000000000000000000000000000000000000005f5e100',
        rawValue: { price: 1000 },
        values: ['100000000'],
      },
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      {
        endpointName: 'convertToUSD',
        ois: fixtures.buildOIS(),
        parameters: { from: 'ETH', amount: '1' },
        metadata: null,
        apiCredentials: [
          {
            securitySchemeName: 'myApiSecurityScheme',
            securitySchemeValue: 'supersecret',
          },
        ],
      },
      { timeout: FIRST_API_CALL_TIMEOUT }
    );
  });

  it('calls the adapter with the given parameters with when request type is http-signed-data-gateway and config just has ois and apiCredentials props', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockResolvedValueOnce({ data: { price: 1000 } });
    const parameters = { _type: 'int256', _path: 'price', from: 'ETH' };
    const encodedParameters =
      '0x317373730000000000000000000000000000000000000000000000000000000066726f6d0000000000000000000000000000000000000000000000000000000045544800000000000000000000000000000000000000000000000000000000005f74797065000000000000000000000000000000000000000000000000000000696e7432353600000000000000000000000000000000000000000000000000005f706174680000000000000000000000000000000000000000000000000000007072696365000000000000000000000000000000000000000000000000000000';
    const endpointId = '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6';
    const templateId = '0xaa1525fe964092a826934ff09c75e1db395b947543a4ca3eb4a19628bad6c6d5';
    const [logs, res] = await callApi({
      type: 'http-signed-data-gateway',
      config: { ois: [fixtures.buildOIS()], apiCredentials: [fixtures.buildApiCredentials()] },
      aggregatedApiCall: fixtures.buildAggregatedHttpSignedDataApiCall({
        endpointId,
        parameters,
        templateId,
        template: {
          airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
          endpointId,
          id: templateId,
          encodedParameters,
        },
      }),
    });

    expect(logs).toEqual([]);
    expect(res).toEqual({
      success: true,
      data: {
        encodedValue: '0x0000000000000000000000000000000000000000000000000000000005f5e100',
        signature: expect.any(String),
        timestamp: expect.any(String),
      },
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      {
        endpointName: 'convertToUSD',
        ois: fixtures.buildOIS(),
        parameters: { from: 'ETH', amount: '1' },
        metadata: null,
        apiCredentials: [
          {
            securitySchemeName: 'myApiSecurityScheme',
            securitySchemeValue: 'supersecret',
          },
        ],
      },
      { timeout: FIRST_API_CALL_TIMEOUT }
    );
  });

  it('uses the default endpoint parameters if no user value is provided', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockResolvedValueOnce({ data: { price: 1000 } });

    await callApi({
      type: 'regular',
      config: fixtures.buildConfig(),
      aggregatedApiCall: fixtures.buildAggregatedRegularApiCall(),
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        parameters: { from: 'ETH', amount: '1' },
      }),
      { timeout: FIRST_API_CALL_TIMEOUT }
    );
  });

  it('retries the API call if the first attempt fails', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockRejectedValueOnce(new Error('First attempt failed'));
    spy.mockResolvedValueOnce({ data: { price: 1000 } });
    const requestedGasPrice = '100000000';
    const requestedMinConfirmations = '0';
    const parameters = {
      _type: 'int256',
      _path: 'price',
      from: 'ETH',
      _gasPrice: requestedGasPrice,
      _minConfirmations: requestedMinConfirmations,
    };

    const [logs, res] = await callApi({
      type: 'regular',
      config: fixtures.buildConfig(),
      aggregatedApiCall: fixtures.buildAggregatedRegularApiCall({ parameters }),
    });

    expect(logs).toEqual([]);
    expect(res).toEqual({
      success: true,
      data: {
        encodedValue: '0x0000000000000000000000000000000000000000000000000000000005f5e100',
        signature:
          '0xe92f5ee40ddb5aa42cab65fcdc025008b2bc026af80a7c93a9aac4e474f8a88f4f2bd861b9cf9a2b050bf0fd13e9714c4575cebbea658d7501e98c0963a5a38b1c',
      },
      // _minConfirmations is processed before making API calls
      reservedParameterOverrides: {
        gasPrice: requestedGasPrice,
      },
    });
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith(
      {
        endpointName: 'convertToUSD',
        ois: fixtures.buildOIS(),
        parameters: { from: 'ETH', amount: '1' },
        metadata: {
          chainId: '31337',
          chainType: 'evm',
          requestId: '0xf40127616f09d41b20891bcfd326957a0e3d5a5ecf659cff4d8106c04b024374',
          requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
          sponsorAddress: '0x2479808b1216E998309A727df8A0A98A1130A162',
          sponsorWalletAddress: '0x1C1CEEF1a887eDeAB20219889971e1fd4645b55D',
        },
        apiCredentials: [
          {
            securitySchemeName: 'myApiSecurityScheme',
            securitySchemeValue: 'supersecret',
          },
        ],
      },
      { timeout: SECOND_API_CALL_TIMEOUT }
    );
  });

  it('returns an error if the API call fails to execute', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    const nonAxiosError = new Error('A non-axios error');
    spy.mockRejectedValueOnce(nonAxiosError);
    spy.mockRejectedValueOnce(nonAxiosError);
    const parameters = { _type: 'int256', _path: 'unknown', from: 'ETH' };
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });
    const [logs, res] = await callApi({ type: 'regular', config: fixtures.buildConfig(), aggregatedApiCall });
    expect(logs).toEqual([{ level: 'ERROR', message: 'Failed to call Endpoint:convertToUSD', error: nonAxiosError }]);
    expect(res).toEqual({
      errorMessage: `${RequestErrorMessage.ApiCallFailed}`,
      success: false,
    });
  });

  const internalAxiosRequestConfig = { headers: new AxiosHeaders() };
  test.each([
    { e: new AxiosError('Error!', 'CODE', internalAxiosRequestConfig, {}, undefined), msg: 'with no response' },
    {
      e: new AxiosError('Error!', 'CODE', internalAxiosRequestConfig, undefined, undefined),
      msg: 'in building the HTTP request',
    },
    {
      e: new AxiosError(
        'Error!',
        'CODE',
        internalAxiosRequestConfig,
        {},
        { status: 404, data: {}, statusText: '', headers: {}, config: internalAxiosRequestConfig }
      ),
      msg: 'with status code 404',
    },
  ])(`returns an error containing "$msg" for the respective axios API call failure`, async ({ e, msg }) => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    const axiosError = e;
    spy.mockRejectedValueOnce(axiosError);
    spy.mockRejectedValueOnce(axiosError);

    const parameters = { _type: 'int256', _path: 'unknown', from: 'ETH' };
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });
    const [logs, res] = await callApi({ type: 'regular', config: fixtures.buildConfig(), aggregatedApiCall });
    expect(logs).toEqual([{ level: 'ERROR', message: 'Failed to call Endpoint:convertToUSD', error: axiosError }]);
    expect(res).toEqual({
      errorMessage: `${RequestErrorMessage.ApiCallFailed} ${msg}`,
      success: false,
    });
  });

  it('returns an error if the value cannot be found with the _path', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockResolvedValueOnce({ data: { price: 1000 } });
    const parameters = { _type: 'int256', _path: 'unknown', from: 'ETH' };
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });
    const [logs, res] = await callApi({ type: 'regular', config: fixtures.buildConfig(), aggregatedApiCall });
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
      type: 'regular',
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
      type: 'regular',
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
      type: 'regular',
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
          environment: 'Node' as const,
          value: 'const output = {...input, from: "BTC"};',
          timeoutMs: 5_000,
        },
        {
          environment: 'Node' as const,
          value: 'const output = {...input, source: "airnode"};',
          timeoutMs: 5_000,
        },
      ];
      config.ois[0].endpoints[0] = { ...config.ois[0].endpoints[0], preProcessingSpecifications };

      const [logs, res] = await callApi({
        type: 'regular',
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
          parameters: { from: 'BTC', source: 'airnode', amount: '1' },
        }),
        { timeout: FIRST_API_CALL_TIMEOUT }
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
          environment: 'Node' as const,
          value: 'const output = parseInt(input.price)*1000;',
          timeoutMs: 5_000,
        },
        {
          environment: 'Node' as const,
          value: 'const output = parseInt(input)*2;',
          timeoutMs: 5_000,
        },
      ];
      config.ois[0].endpoints[0] = { ...config.ois[0].endpoints[0], postProcessingSpecifications };

      const [logs, res] = await callApi({
        type: 'regular',
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
          parameters: { from: 'ETH', amount: '1' },
        }),
        { timeout: FIRST_API_CALL_TIMEOUT }
      );
    });
  });
  describe('skip API call', () => {
    const createEncodedValue = (value: ethers.BigNumber, times = 100_000) =>
      `0x${value.mul(times).toHexString().substring(2).padStart(64, '0')}`;

    it('skips the API call with preProcessingSpecifications', async () => {
      const config = fixtures.buildConfig();
      const parameters = { _type: 'int256', _path: 'result', parameter1: '25' };
      const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });
      const preProcessingSpecifications = [
        {
          environment: 'Node' as const,
          value: 'const output = { result: (parseInt(input.parameter1) * 2).toString() }',
          timeoutMs: 5000,
        },
      ];

      config.ois[0].endpoints[0].operation = undefined;
      config.ois[0].endpoints[0].fixedOperationParameters = [];
      config.ois[0].endpoints[0].preProcessingSpecifications = preProcessingSpecifications;

      const [logs, res] = await callApi({
        type: 'regular',
        config,
        aggregatedApiCall,
      });

      expect(logs).toEqual([]);
      expect(res).toEqual({
        success: true,
        data: {
          encodedValue: createEncodedValue(ethers.BigNumber.from(25 * 2)),
          signature:
            '0x148d65210b201c3ddd6f8e08cfc29032e9f3c781919eeb80b950dbb984ebbbee289105ea8b591ace166d04b65e334801ea0177bb431775db2b4268d55fa4e2a81c',
        },
      });
    });

    it('skips the API call with postProcessingSpecifications', async () => {
      const config = fixtures.buildConfig();
      const parameters = { _type: 'int256', _path: 'result', parameter1: '25' };
      const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });
      const postProcessingSpecifications = [
        {
          environment: 'Node' as const,
          value: 'const output = { result: (parseInt(input.parameter1) * 2).toString() }',
          timeoutMs: 5000,
        },
      ];

      config.ois[0].endpoints[0].operation = undefined;
      config.ois[0].endpoints[0].fixedOperationParameters = [];
      config.ois[0].endpoints[0].postProcessingSpecifications = postProcessingSpecifications;

      const [logs, res] = await callApi({
        type: 'regular',
        config,
        aggregatedApiCall,
      });

      expect(logs).toEqual([]);
      expect(res).toEqual({
        success: true,
        data: {
          encodedValue: createEncodedValue(ethers.BigNumber.from(25 * 2)),
          signature:
            '0x148d65210b201c3ddd6f8e08cfc29032e9f3c781919eeb80b950dbb984ebbbee289105ea8b591ace166d04b65e334801ea0177bb431775db2b4268d55fa4e2a81c',
        },
      });
    });

    it('skips API call with both preProcessingSpecifications and postProcessingSpecifications', async () => {
      const config = fixtures.buildConfig();
      const parameters = { _type: 'int256', _path: 'result', parameter1: '25' };
      const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });
      const preProcessingSpecifications = [
        {
          environment: 'Node' as const,
          value: 'const output = {...input, addThis: "5" }',
          timeoutMs: 5000,
        },
      ];
      const postProcessingSpecifications = [
        {
          environment: 'Node' as const,
          value: 'const output = { result: (parseInt(input.parameter1) * 2 + parseInt(input.addThis)).toString() }',
          timeoutMs: 5000,
        },
      ];

      config.ois[0].endpoints[0].operation = undefined;
      config.ois[0].endpoints[0].fixedOperationParameters = [];
      config.ois[0].endpoints[0].preProcessingSpecifications = preProcessingSpecifications;
      config.ois[0].endpoints[0].postProcessingSpecifications = postProcessingSpecifications;

      const [logs, res] = await callApi({
        type: 'regular',
        config,
        aggregatedApiCall,
      });

      expect(logs).toEqual([]);
      expect(res).toEqual({
        success: true,
        data: {
          encodedValue: createEncodedValue(ethers.BigNumber.from(25 * 2 + 5)),
          signature:
            '0x9796e8ba07c517a43b2ca1416b9c975541345c5b7bf73613738ed84216c4573d1656cbc385acb9111b7077fba65418b59cfe3f59ee81109523664bbc25efcfd71b',
        },
      });
    });

    it('fails when both preProcessingSpecifications and postProcessingSpecifications are empty', async () => {
      const config = fixtures.buildConfig();
      const parameters = { _type: 'int256', _path: 'result', parameter1: '25' };
      const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });

      config.ois[0].endpoints[0].operation = undefined;
      config.ois[0].endpoints[0].fixedOperationParameters = [];
      config.ois[0].endpoints[0].preProcessingSpecifications = [];
      config.ois[0].endpoints[0].postProcessingSpecifications = [];

      const [logs, res] = await callApi({
        type: 'regular',
        config,
        aggregatedApiCall,
      });

      expect(logs).toEqual([
        {
          level: 'ERROR',
          message:
            "Failed to skip API call. Ensure at least one of 'preProcessingSpecifications' or 'postProcessingSpecifications' is defined and is not an empty array at ois 'Currency Converter API', endpoint 'convertToUSD'.",
        },
      ]);
      expect(res).toEqual({
        success: false,
        errorMessage: `Failed to skip API call. Ensure at least one of 'preProcessingSpecifications' or 'postProcessingSpecifications' is defined and is not an empty array at ois 'Currency Converter API', endpoint 'convertToUSD'.`,
      });
    });

    it('fails when both preProcessingSpecifications and postProcessingSpecifications are undefined', async () => {
      const config = fixtures.buildConfig();
      const parameters = { _type: 'int256', _path: 'result', parameter1: '25' };
      const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });

      config.ois[0].endpoints[0].operation = undefined;
      config.ois[0].endpoints[0].fixedOperationParameters = [];
      config.ois[0].endpoints[0].preProcessingSpecifications = undefined;
      config.ois[0].endpoints[0].postProcessingSpecifications = undefined;

      const [logs, res] = await callApi({
        type: 'regular',
        config,
        aggregatedApiCall,
      });

      expect(logs).toEqual([
        {
          level: 'ERROR',
          message:
            "Failed to skip API call. Ensure at least one of 'preProcessingSpecifications' or 'postProcessingSpecifications' is defined and is not an empty array at ois 'Currency Converter API', endpoint 'convertToUSD'.",
        },
      ]);
      expect(res).toEqual({
        success: false,
        errorMessage: `Failed to skip API call. Ensure at least one of 'preProcessingSpecifications' or 'postProcessingSpecifications' is defined and is not an empty array at ois 'Currency Converter API', endpoint 'convertToUSD'.`,
      });
    });
  });
});

describe('verifyTemplateId', () => {
  const validTemplateFields = {
    airnodeAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    endpointId: '0x2f3a3adf6daf5a3bb00ab83aa82262a6a84b59b0a89222386135330a1819ab48',
    encodedParameters: '0x6466726f6d63455448',
  };

  const TEMPLATE_ID = '0xb2f063157fcc3c986daf4c2cf1b8ac8b8843f2b1a54c5de5e1ebdf12fb85a927';

  it('returns API calls not linked to templates', () => {
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ templateId: null });
    const config = fixtures.buildConfig();

    const response = verifyTemplateId({ type: 'regular', aggregatedApiCall, config });

    expect(response).toEqual(null);
  });

  it('ignores API calls where the template cannot be found', () => {
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({
      templateId: TEMPLATE_ID,
      template: undefined,
    });
    const config = fixtures.buildConfig();

    const response = verifyTemplateId({ type: 'regular', aggregatedApiCall, config });

    expect(response).toEqual([
      [
        {
          level: 'ERROR',
          message: `Ignoring Request:${aggregatedApiCall.id} as the template could not be found for verification`,
        },
      ],
      {
        errorMessage: `Ignoring Request:${aggregatedApiCall.id} as the template could not be found for verification`,
        success: false,
      },
    ]);
  });

  it('does nothing where API calls are linked to a valid templated', () => {
    const template = fixtures.requests.buildApiCallTemplate({
      ...validTemplateFields,
      id: TEMPLATE_ID,
    });
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({
      templateId: TEMPLATE_ID,
      template,
    });
    const config = fixtures.buildConfig();

    const response = verifyTemplateId({ type: 'regular', aggregatedApiCall, config });

    expect(response).toEqual(null);
  });

  describe('invalid fields', () => {
    const validTemplate = fixtures.requests.buildApiCallTemplate({
      ...validTemplateFields,
      id: TEMPLATE_ID,
    });
    const config = fixtures.buildConfig();
    const invalidFields = {
      airnodeAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
      endpointId: '0x05218bc3e2497776d24b7da2890e12c910d07ce647cc45bd565cbb167e620df3',
      encodedParameters: '0x1234',
    };

    Object.keys(invalidFields).forEach((field) => {
      it(`is invalid if ${field} has been changed`, () => {
        const invalidTemplate = { ...validTemplate, [field]: (invalidFields as any)[field] };
        const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({
          templateId: TEMPLATE_ID,
          template: invalidTemplate,
        });
        const expectedTemplateId = getExpectedTemplateIdV0(invalidTemplate);
        const response = verifyTemplateId({ type: 'regular', aggregatedApiCall, config });
        expect(response).toEqual([
          [
            {
              level: 'ERROR',
              message: `Invalid template ID:${TEMPLATE_ID} found for Request:${aggregatedApiCall.id}. Expected template ID:${expectedTemplateId}`,
            },
          ],
          {
            errorMessage: `Invalid template ID:${TEMPLATE_ID} found for Request:${aggregatedApiCall.id}. Expected template ID:${expectedTemplateId}`,
            success: false,
          },
        ]);
      });
    });
  });
});
