import * as adapter from '@api3/airnode-adapter';
import { processHttpSignedDataRequest } from '../../src/workers/local-handlers';
import { deployAirnodeAndMakeRequests, increaseTestTimeout } from '../setup/e2e';

it('makes a call for signed API data', async () => {
  // Set a fake time so that the generated timestamp of the test is always the same
  const mockedTimestamp = new Date(`2021-02-14`).valueOf();
  jest.spyOn(global.Date, 'now').mockImplementationOnce(() => mockedTimestamp);
  jest.spyOn(adapter, 'buildAndExecuteRequest');

  increaseTestTimeout();
  await deployAirnodeAndMakeRequests(__filename);

  const parameters =
    '0x317373730000000000000000000000000000000000000000000000000000000066726f6d0000000000000000000000000000000000000000000000000000000045544800000000000000000000000000000000000000000000000000000000005f74797065000000000000000000000000000000000000000000000000000000696e7432353600000000000000000000000000000000000000000000000000005f70617468000000000000000000000000000000000000000000000000000000726573756c740000000000000000000000000000000000000000000000000000';
  // EndpointID from the trigger fixture ../fixtures/config/config.ts
  const endpointId = '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6';

  const result = await processHttpSignedDataRequest(endpointId, parameters);

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
