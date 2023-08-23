import { HttpGatewayApiCallResponse } from '../../src';
import { processHttpRequest } from '../../src/handlers';
import { deployAirnodeAndMakeRequests, increaseTestTimeout } from '../setup/e2e';

increaseTestTimeout();

describe('processHttpRequest', () => {
  const parameters = {
    from: 'ETH',
    _type: 'int256',
    _path: 'result',
  };

  // EndpointID from the trigger fixture ../fixtures/config/config.ts
  const endpointId = '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6';

  let config: any;
  beforeAll(async () => {
    const deploymentData = await deployAirnodeAndMakeRequests(__filename);
    config = deploymentData.config;
  });

  it('makes a call to test the API', async () => {
    const [_err, result] = await processHttpRequest(config, endpointId, parameters);

    const expected: HttpGatewayApiCallResponse = {
      // Value is returned by the mock server from the operation package
      data: {
        rawValue: { result: '723.39202' },
        encodedValue: '0x00000000000000000000000000000000000000000000000000000000044fcf02',
        values: ['72339202'],
      },
      success: true,
    };
    expect(result).toEqual(expected);
  });

  it('returns data from a successful API call that failed processing', async () => {
    const invalidType = 'invalidType';

    // Use a minimal reserved parameters array with only _type (which is required by OIS) and an invalid value
    const modifiedConfig = { ...config };
    modifiedConfig.ois[0].endpoints[0].reservedParameters = [{ name: '_type', fixed: invalidType }];
    const minimalParameters = { from: 'ETH' };

    const [_err, result] = await processHttpRequest(modifiedConfig, endpointId, minimalParameters);

    const expected: HttpGatewayApiCallResponse = {
      data: { rawValue: { result: '723.39202' } },
      success: true,
      errorMessage: `Invalid type: ${invalidType}`,
    };

    expect(result).toEqual(expected);
  });
});
