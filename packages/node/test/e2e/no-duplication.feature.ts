import fs from 'fs';
import * as handlers from '../../src/workers/local-handlers';
import * as e2e from '../setup/e2e';
import * as fixtures from '../fixtures';

it('does not process requests twice', async () => {
  jest.setTimeout(45_000);

  const provider = e2e.buildProvider();

  const deployerIndex = e2e.getDeployerIndex(__filename);
  const deployConfig = fixtures.operation.buildDeployConfig({ deployerIndex });
  const deployment = await e2e.deployAirnodeRrp(deployConfig);

  await e2e.makeRequests(deployConfig, deployment);

  const preinvokeLogs = await e2e.fetchAllLogs(provider, deployment.contracts.AirnodeRrp);

  const preinvokeRegularRequests = preinvokeLogs.filter((log) => log.name === 'MadeTemplateRequest');
  const preinvokeFullRequests = preinvokeLogs.filter((log) => log.name === 'MadeFullRequest');
  const preinvokeFulfillments = preinvokeLogs.filter((log) => log.name === 'FulfilledRequest');

  expect(preinvokeLogs.length).toEqual(5);
  expect(preinvokeRegularRequests.length).toEqual(1);
  expect(preinvokeFullRequests.length).toEqual(1);
  expect(preinvokeFulfillments.length).toEqual(0);

  const nodeSettings = fixtures.buildNodeSettings({
    airnodeWalletMnemonic: deployConfig.airnodes.CurrencyConverterAirnode.mnemonic,
  });
  const chain = e2e.buildChainConfig(deployment.contracts);
  const config = fixtures.buildConfig({ chains: [chain], nodeSettings });
  jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));

  await handlers.startCoordinator();

  const postinvokeLogs = await e2e.fetchAllLogs(provider, deployment.contracts.AirnodeRrp);

  const postinvokeRegularRequests = postinvokeLogs.filter((log) => log.name === 'MadeTemplateRequest');
  const postinvokeFullRequests = postinvokeLogs.filter((log) => log.name === 'MadeFullRequest');
  const postinvokeFulfillments = postinvokeLogs.filter((log) => log.name === 'FulfilledRequest');

  expect(postinvokeLogs.length).toEqual(7);
  expect(postinvokeRegularRequests.length).toEqual(1);
  expect(postinvokeFullRequests.length).toEqual(1);
  expect(postinvokeFulfillments.length).toEqual(2);

  // Check each fulfillment is linked to a request
  postinvokeFulfillments.forEach((fulfillment) => {
    const request = postinvokeLogs.find((log) => log.args.requestId === fulfillment.args.requestId);
    expect(request).toBeDefined();
  });

  await handlers.startCoordinator();

  // There should be no more logs created
  const run2Logs = await e2e.fetchAllLogs(provider, deployment.contracts.AirnodeRrp);
  expect(run2Logs.length).toEqual(postinvokeLogs.length);
});
