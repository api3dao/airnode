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
  const endpointId = '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353';
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
