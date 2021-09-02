import fs from 'fs';
import * as handlers from '../../src/workers/local-handlers';
import * as fixtures from '../fixtures';
import * as e2e from '../setup/e2e';

const expectSameRequestId = (req1: any, req2: any) => expect(req1.args.requestId).toBe(req2.args.requestId);

it('should call fail function on AirnodeRrp contract and emit FailedRequest if requester contract fulfillment fails', async () => {
  jest.setTimeout(45_000);

  const provider = e2e.buildProvider();

  const deployerIndex = e2e.getDeployerIndex(__filename);

  const requests = [
    fixtures.operation.buildTemplateRequest({ fulfillFunctionName: 'fulfillAlwaysReverts' }),
    fixtures.operation.buildFullRequest(),
  ];
  const deployConfig = fixtures.operation.buildDeployConfig({ deployerIndex, requests });

  const deployment = await e2e.deployAirnodeRrp(deployConfig);

  // Overwrites the one injected by the jest setup script
  process.env.MASTER_KEY_MNEMONIC = deployConfig.airnodes.CurrencyConverterAirnode.mnemonic;

  await e2e.makeRequests(deployConfig, deployment);

  const preinvokeLogs = await e2e.fetchAllLogs(provider, deployment.contracts.AirnodeRrp);

  const preinvokeTemplateRequests = preinvokeLogs.filter((log) => log.name === 'MadeTemplateRequest');
  const preinvokeFullRequests = preinvokeLogs.filter((log) => log.name === 'MadeFullRequest');
  const preinvokeFulfillments = preinvokeLogs.filter((log) => log.name === 'FulfilledRequest');

  expect(preinvokeLogs.length).toEqual(5);
  expect(preinvokeTemplateRequests.length).toEqual(1);
  expect(preinvokeFullRequests.length).toEqual(1);
  expect(preinvokeFulfillments.length).toEqual(0);

  const chain = e2e.buildChainConfig(deployment.contracts);
  const config = fixtures.buildConfig({ chains: [chain] });
  jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify([config]));

  await handlers.startCoordinator();

  const postinvokeLogs = await e2e.fetchAllLogs(provider, deployment.contracts.AirnodeRrp);

  const postinvokeTemplateRequests = postinvokeLogs.filter((log) => log.name === 'MadeTemplateRequest');
  const postinvokeFullRequests = postinvokeLogs.filter((log) => log.name === 'MadeFullRequest');
  const postinvokeFulfillmentsFailed = postinvokeLogs.filter((log) => log.name === 'FailedRequest');
  const postinvokeFulfillments = postinvokeLogs.filter((log) => log.name === 'FulfilledRequest');

  expect(postinvokeLogs.length).toEqual(7);
  expect(postinvokeTemplateRequests.length).toEqual(1);
  expect(postinvokeFullRequests.length).toEqual(1);
  expect(postinvokeFulfillmentsFailed.length).toEqual(1);
  expect(postinvokeFulfillments.length).toEqual(1);

  // Check each fulfillment failed is linked to a request
  postinvokeFulfillmentsFailed.forEach((fulfillment) => {
    const request = postinvokeLogs.find((log) => log.args.requestId === fulfillment.args.requestId);
    expect(request).toBeDefined();
  });
});

it('should call fail function on AirnodeRrp contract and emit FailedRequest if requester contract fulfillment runs out of gas', async () => {
  jest.setTimeout(45_000);

  const provider = e2e.buildProvider();

  const deployerIndex = e2e.getDeployerIndex(__filename);

  const requests = [
    fixtures.operation.buildTemplateRequest({ fulfillFunctionName: 'fulfillAlwaysRunsOutOfGas' }),
    fixtures.operation.buildFullRequest(),
  ];
  const deployConfig = fixtures.operation.buildDeployConfig({ deployerIndex, requests });

  const deployment = await e2e.deployAirnodeRrp(deployConfig);

  // Overwrites the one injected by the jest setup script
  process.env.MASTER_KEY_MNEMONIC = deployConfig.airnodes.CurrencyConverterAirnode.mnemonic;

  await e2e.makeRequests(deployConfig, deployment);

  const preInvokelogNames = (await e2e.fetchAllLogs(provider, deployment.contracts.AirnodeRrp)).map(({ name }) => name);
  expect(preInvokelogNames).toEqual([
    'SetAirnodeXpub',
    'SetSponsorshipStatus',
    'CreatedTemplate',
    'MadeTemplateRequest',
    'MadeFullRequest',
  ]);

  const chain = e2e.buildChainConfig(deployment.contracts);
  const config = fixtures.buildConfig({ chains: [chain] });
  jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify([config]));

  await handlers.startCoordinator();

  const postInvokeLogs = await e2e.fetchAllLogs(provider, deployment.contracts.AirnodeRrp);
  expect(postInvokeLogs.map(({ name }) => name)).toEqual([
    'SetAirnodeXpub',
    'SetSponsorshipStatus',
    'CreatedTemplate',
    'MadeTemplateRequest',
    'MadeFullRequest',
    'FailedRequest',
    'FulfilledRequest',
  ]);

  const failedRequest = postInvokeLogs.filter(({ name }) => name === 'FailedRequest')[0];
  const templateRequest = postInvokeLogs.filter(({ name }) => name === 'MadeTemplateRequest')[0];
  expectSameRequestId(templateRequest, failedRequest);

  const fulfilledRequest = postInvokeLogs.filter(({ name }) => name === 'FulfilledRequest')[0];
  const fullRequest = postInvokeLogs.filter(({ name }) => name === 'MadeFullRequest')[0];
  expectSameRequestId(fulfilledRequest, fullRequest);
});
