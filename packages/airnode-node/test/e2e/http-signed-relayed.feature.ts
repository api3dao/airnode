import * as adapter from '@api3/airnode-adapter';
import { processHttpSignedRelayedRequests } from '../../src/workers/local-handlers';
import { deployAirnodeAndMakeRequests, increaseTestTimeout } from '../setup/e2e';

it('makes a call for signed relayed API data', async () => {
  // Set a fake time so that the generated timestamp of the test is always the same
  const mockedTimestamp = new Date(`2021-02-14`).valueOf();
  jest.spyOn(global.Date, 'now').mockImplementationOnce(() => mockedTimestamp);
  jest.spyOn(adapter, 'buildAndExecuteRequest');

  increaseTestTimeout();
  await deployAirnodeAndMakeRequests(__filename);

  const parameters = {
    from: 'ETH',
    _type: 'int256',
    _path: 'result',
    _relayer: '0xA7b4c9bf0AF030a171c49400d3299703d3E97706',
    _id: '0xcf2816af81f9cc7c9879dc84ce29c00fe1e290bcb8d2e4b204be1eeb120811bf',
  };
  // EndpointID from the trigger fixture ../fixtures/config/config.ts
  const endpointId = '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6';

  const result = await processHttpSignedRelayedRequests(endpointId, parameters);

  const expected = {
    // Value is returned by the mock server from the operation package
    value: JSON.stringify({
      timestamp: '1613260800',
      value: '0x00000000000000000000000000000000000000000000000000000000044fcf02',
    }),
    success: true,
    // We expect any string, because the Airnode wallet (and Airnode mnemonic) is different for every test which
    // produces a different signature everytime.
    signature: expect.any(String),
  };
  expect(result).toEqual(expected);
  // Verify that all internal parameters have been removed from the parameters forwarded to the API
  expect(adapter.buildAndExecuteRequest).toHaveBeenCalledWith(
    expect.objectContaining({ parameters: { from: 'ETH' } }),
    { timeout: 30000 }
  );
});
