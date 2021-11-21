import { testApi } from '../../src/workers/local-handlers';
import { deployAirnodeAndMakeRequests, increaseTestTimeout } from '../setup/e2e';

it('makes a call to test the API', async () => {
  increaseTestTimeout();
  await deployAirnodeAndMakeRequests(__filename);

  const parameters = {
    from: 'ETH',
    _type: 'int256',
    _path: 'result',
  };

  // EndpointID from the trigger fixture ../fixtures/config/config.ts
  const endpointId = '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6';
  // Value is returned by the mock server from the operation package
  const expected = {
    value: JSON.stringify({
      rawValue: { success: true, result: '723.392028' },
      encodedValue: '0x00000000000000000000000000000000000000000000000000000000044fcf02',
      values: ['72339202'],
    }),
  };

  const result = await testApi(endpointId, parameters);
  expect(result).toEqual(expected);
});
