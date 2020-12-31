import fs from 'fs';
import * as handlers from '../../src/workers/local-handlers';
import * as operation from '../setup/e2e/deployment';
import * as e2eUtils from '../setup/e2e/utils';
import * as fixtures from '../fixtures';

it('does not process requests twice', async () => {
  jest.setTimeout(45_000);

  const provider = e2eUtils.buildProvider();

  const deployerIndex = e2eUtils.getDeployerIndex(__filename);
  const deployConfig = fixtures.operation.buildDeployConfig({ deployerIndex });
  const deployment = await operation.deployAirnode(deployConfig);

  process.env.MASTER_KEY_MNEMONIC = deployConfig.apiProviders.CurrencyConverterAPI.mnemonic;

  await operation.makeRequests(deployConfig, deployment);

  const preinvokeLogs = await e2eUtils.fetchAllLogs(provider, deployment.contracts.Airnode);

  const preinvokeShortRequests = preinvokeLogs.filter((log) => log.name === 'ClientShortRequestCreated');
  const preinvokeRegularRequests = preinvokeLogs.filter((log) => log.name === 'ClientRequestCreated');
  const preinvokeFullRequests = preinvokeLogs.filter((log) => log.name === 'ClientFullRequestCreated');
  const preinvokeFulfillments = preinvokeLogs.filter((log) => log.name === 'ClientRequestFulfilled');

  expect(preinvokeLogs.length).toEqual(9);
  expect(preinvokeShortRequests.length).toEqual(1);
  expect(preinvokeRegularRequests.length).toEqual(1);
  expect(preinvokeFullRequests.length).toEqual(1);
  expect(preinvokeFulfillments.length).toEqual(0);

  const contracts = {
    Airnode: deployment.contracts.Airnode,
    Convenience: deployment.contracts.Convenience,
  };

  const chain = e2eUtils.buildChainConfig(contracts);
  const nodeSettings = fixtures.buildNodeSettings({ chains: [chain] });
  const config = fixtures.buildConfig({ nodeSettings });
  jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));

  await handlers.startCoordinator();

  const postinvokeLogs = await e2eUtils.fetchAllLogs(provider, deployment.contracts.Airnode);

  const postinvokeShortRequests = postinvokeLogs.filter((log) => log.name === 'ClientShortRequestCreated');
  const postinvokeRegularRequests = postinvokeLogs.filter((log) => log.name === 'ClientRequestCreated');
  const postinvokeFullRequests = postinvokeLogs.filter((log) => log.name === 'ClientFullRequestCreated');
  const postinvokeFulfillments = postinvokeLogs.filter((log) => log.name === 'ClientRequestFulfilled');

  expect(postinvokeLogs.length).toEqual(12);
  expect(postinvokeShortRequests.length).toEqual(1);
  expect(postinvokeRegularRequests.length).toEqual(1);
  expect(postinvokeFullRequests.length).toEqual(1);
  expect(postinvokeFulfillments.length).toEqual(3);

  // Check each fulfillment is linked to a request
  postinvokeFulfillments.forEach((fulfillment) => {
    const request = postinvokeLogs.find((log) => log.args.requestId === fulfillment.args.requestId);
    expect(request).toBeDefined();
  });

  await handlers.startCoordinator();

  // There should be no more logs created
  const postpostLogs = await e2eUtils.fetchAllLogs(provider, deployment.contracts.Airnode);
  expect(postpostLogs.length).toEqual(postinvokeLogs.length);
});
