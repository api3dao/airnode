import fs from 'fs';
import * as handlers from '../../src/workers/local-handlers';
import * as e2e from '../setup/e2e';
import * as fixtures from '../fixtures';

it('makes a call to test the API', async () => {
  jest.setTimeout(45_000);

  const deployerIndex = e2e.getDeployerIndex(__filename);
  const deployConfig = fixtures.operation.buildDeployConfig({ deployerIndex });
  const deployment = await e2e.deployAirnodeRrp(deployConfig);
  const chain = e2e.buildChainConfig(deployment.contracts);
  const config = fixtures.buildConfig({ chains: [chain] });
  jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));

  const parameters = {
    from: 'ETH',
    _type: 'int256',
    _path: 'result',
  };

  // EndpointID from the trigger fixture ../fixtures/config/config.ts
  const endpointId = '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353';
  // Value is returned by the mock server from the operation package
  const expected = { value: '72339202' };

  const result = await handlers.testApi(endpointId, parameters);
  expect(result).toEqual(expected);
});
