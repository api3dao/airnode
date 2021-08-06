import fs from 'fs';
import * as handlers from '../../src/workers/local-handlers';
import * as fixtures from '../fixtures';
import * as e2e from '../setup/e2e';

it('should call fail function on AirnodeRrp contract and emit ClientRequestFailed if client contract fulfillment fails', async () => {
  jest.setTimeout(45_000);

  const provider = e2e.buildProvider();

  const deployerIndex = e2e.getDeployerIndex(__filename);

  const requests = [
    fixtures.operation.buildRegularRequest({ fulfillFunctionName: 'fulfillAlwaysReverts' }),
    fixtures.operation.buildFullRequest(),
  ];
  const deployConfig = fixtures.operation.buildDeployConfig({ deployerIndex, requests });

  const deployment = await e2e.deployAirnodeRrp(deployConfig);

  // Overwrites the one injected by the jest setup script
  process.env.MASTER_KEY_MNEMONIC = deployConfig.airnodes.CurrencyConverterAirnode.mnemonic;

  await e2e.makeRequests(deployConfig, deployment);

  const preinvokeLogs = await e2e.fetchAllLogs(provider, deployment.contracts.AirnodeRrp);

  const preinvokeRegularRequests = preinvokeLogs.filter((log) => log.name === 'ClientRequestCreated');
  const preinvokeFullRequests = preinvokeLogs.filter((log) => log.name === 'ClientFullRequestCreated');
  const preinvokeFulfillments = preinvokeLogs.filter((log) => log.name === 'ClientRequestFulfilled');

  expect(preinvokeLogs.length).toEqual(7);
  expect(preinvokeRegularRequests.length).toEqual(1);
  expect(preinvokeFullRequests.length).toEqual(1);
  expect(preinvokeFulfillments.length).toEqual(0);

  const chain = e2e.buildChainConfig(deployment.contracts);
  const config = fixtures.buildConfig({ chains: [chain] });
  jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));

  await handlers.startCoordinator();

  const postinvokeLogs = await e2e.fetchAllLogs(provider, deployment.contracts.AirnodeRrp);

  const postinvokeRegularRequests = postinvokeLogs.filter((log) => log.name === 'ClientRequestCreated');
  const postinvokeFullRequests = postinvokeLogs.filter((log) => log.name === 'ClientFullRequestCreated');
  const postinvokeFulfillmentsFailed = postinvokeLogs.filter((log) => log.name === 'ClientRequestFailed');
  const postinvokeFulfillments = postinvokeLogs.filter((log) => log.name === 'ClientRequestFulfilled');

  expect(postinvokeLogs.length).toEqual(9);
  expect(postinvokeRegularRequests.length).toEqual(1);
  expect(postinvokeFullRequests.length).toEqual(1);
  expect(postinvokeFulfillmentsFailed.length).toEqual(1);
  expect(postinvokeFulfillments.length).toEqual(1);

  // Check each fulfillment failed is linked to a request
  postinvokeFulfillmentsFailed.forEach((fulfillment) => {
    const request = postinvokeLogs.find((log) => log.args.requestId === fulfillment.args.requestId);
    expect(request).toBeDefined();
  });
});

it('should call fail function on AirnodeRrp contract and emit ClientRequestFailed if client contract fulfillment runs out of gas', async () => {
  jest.setTimeout(45_000);

  const provider = e2e.buildProvider();

  const deployerIndex = e2e.getDeployerIndex(__filename);

  const requests = [
    fixtures.operation.buildRegularRequest({ fulfillFunctionName: 'fulfillAlwaysRunsOutOfGas' }),
    fixtures.operation.buildFullRequest(),
  ];
  const deployConfig = fixtures.operation.buildDeployConfig({ deployerIndex, requests });

  const deployment = await e2e.deployAirnodeRrp(deployConfig);

  // Overwrites the one injected by the jest setup script
  process.env.MASTER_KEY_MNEMONIC = deployConfig.airnodes.CurrencyConverterAirnode.mnemonic;

  await e2e.makeRequests(deployConfig, deployment);

  const preinvokeLogs = await e2e.fetchAllLogs(provider, deployment.contracts.AirnodeRrp);

  const preinvokeRegularRequests = preinvokeLogs.filter((log) => log.name === 'ClientRequestCreated');
  const preinvokeFullRequests = preinvokeLogs.filter((log) => log.name === 'ClientFullRequestCreated');
  const preinvokeFulfillments = preinvokeLogs.filter((log) => log.name === 'ClientRequestFulfilled');

  expect(preinvokeLogs.length).toEqual(7);
  expect(preinvokeRegularRequests.length).toEqual(1);
  expect(preinvokeFullRequests.length).toEqual(1);
  expect(preinvokeFulfillments.length).toEqual(0);

  const chain = e2e.buildChainConfig(deployment.contracts);
  const config = fixtures.buildConfig({ chains: [chain] });
  jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));

  await handlers.startCoordinator();

  const postinvokeLogs = await e2e.fetchAllLogs(provider, deployment.contracts.AirnodeRrp);

  const postinvokeRegularRequests = postinvokeLogs.filter((log) => log.name === 'ClientRequestCreated');
  const postinvokeFullRequests = postinvokeLogs.filter((log) => log.name === 'ClientFullRequestCreated');
  const postinvokeFulfillmentsFailed = postinvokeLogs.filter((log) => log.name === 'ClientRequestFailed');
  const postinvokeFulfillments = postinvokeLogs.filter((log) => log.name === 'ClientRequestFulfilled');

  expect(postinvokeLogs.length).toEqual(9);
  expect(postinvokeRegularRequests.length).toEqual(1);
  expect(postinvokeFullRequests.length).toEqual(1);
  expect(postinvokeFulfillmentsFailed.length).toEqual(1);
  expect(postinvokeFulfillments.length).toEqual(1);

  // Check each fulfillment failed is linked to a request
  postinvokeFulfillmentsFailed.forEach((fulfillment) => {
    const request = postinvokeLogs.find((log) => log.args.requestId === fulfillment.args.requestId);
    expect(request).toBeDefined();
  });
});
