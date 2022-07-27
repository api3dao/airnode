import { HttpGatewayApiCallResponse } from '../../src';
import { processHttpRequest } from '../../src/handlers';
import { deployAirnodeAndMakeRequests, increaseTestTimeout } from '../setup/e2e';

increaseTestTimeout();

it('makes a call to test the API', async () => {
  const { config } = await deployAirnodeAndMakeRequests(__filename);

  const parameters = {
    from: 'ETH',
    _type: 'int256',
    _path: 'result',
  };
  // EndpointID from the trigger fixture ../fixtures/config/config.ts
  const endpointId = '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6';

  const result = await processHttpRequest(config, endpointId, parameters);

  const expected: HttpGatewayApiCallResponse = {
    // Value is returned by the mock server from the operation package
    data: {
      rawValue: { success: true, result: '723.39202' },
      encodedValue: '0x00000000000000000000000000000000000000000000000000000000044fcf02',
      values: ['72339202'],
    },
    success: true,
  };
  expect(result).toEqual(expected);
});
