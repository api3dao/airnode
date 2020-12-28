import fs from 'fs';
import { ethers } from 'ethers';
import * as handlers from '../../src/workers/local-handlers';
import * as operation from '../setup/e2e/deploy-airnode';
import { buildDeployConfig } from '../fixtures/operation/deploy-config';
import { buildConfig } from '../fixtures';

describe('runs', () => {
  it('does not process requests twice', async () => {
    jest.setTimeout(30_000);

    const deployConfig = buildDeployConfig();
    const deployment = await operation.deployAirnode(deployConfig);

    const config = buildConfig();
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));

    await handlers.startCoordinator();

    const filter: ethers.providers.Filter = {
      fromBlock: 0,
      address: deployment.contracts.Airnode,
    };
    const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545/');
    const logs = await provider.getLogs(filter);

    expect(logs).toEqual([]);
  });
});
