import { startCoordinator } from '../../src/workers/local-handlers';
import { operation } from '../fixtures';
import {
  fetchAllLogNames,
  fetchAllLogs,
  filterLogsByName,
  deployAirnodeAndMakeRequests,
  increaseTestTimeout,
} from '../setup/e2e';

const expectSameRequestId = (req1: any, req2: any) => expect(req1.args.requestId).toBe(req2.args.requestId);

it('should call fail function on AirnodeRrp contract and emit FailedRequest if requester contract fulfillment fails', async () => {
  increaseTestTimeout();
  const { deployment, provider } = await deployAirnodeAndMakeRequests(__filename, [
    operation.buildTemplateRequest({ fulfillFunctionName: 'fulfillAlwaysReverts' }),
    operation.buildFullRequest(),
  ]);

  const preInvokeLogs = await fetchAllLogNames(provider, deployment.contracts.AirnodeRrp);
  expect(preInvokeLogs).toEqual([
    'SetAirnodeXpub',
    'SetSponsorshipStatus',
    'CreatedTemplate',
    'MadeTemplateRequest',
    'MadeFullRequest',
  ]);

  await startCoordinator();

  const postInvokeLogs = await fetchAllLogs(provider, deployment.contracts.AirnodeRrp);
  expect(postInvokeLogs.map(({ name }) => name)).toEqual([
    'SetAirnodeXpub',
    'SetSponsorshipStatus',
    'CreatedTemplate',
    'MadeTemplateRequest',
    'MadeFullRequest',
    'FailedRequest',
    'FulfilledRequest',
  ]);

  const failedRequest = filterLogsByName(postInvokeLogs, 'FailedRequest')[0];
  const templateRequest = filterLogsByName(postInvokeLogs, 'MadeTemplateRequest')[0];
  expectSameRequestId(templateRequest, failedRequest);

  const fulfilledRequest = filterLogsByName(postInvokeLogs, 'FulfilledRequest')[0];
  const fullRequest = filterLogsByName(postInvokeLogs, 'MadeFullRequest')[0];
  expectSameRequestId(fulfilledRequest, fullRequest);
});

it('should call fail function on AirnodeRrp contract and emit FailedRequest if requester contract fulfillment runs out of gas', async () => {
  increaseTestTimeout();
  const { deployment, provider } = await deployAirnodeAndMakeRequests(__filename, [
    operation.buildTemplateRequest({ fulfillFunctionName: 'fulfillAlwaysRunsOutOfGas' }),
    operation.buildFullRequest(),
  ]);

  const preInvokelogNames = await fetchAllLogNames(provider, deployment.contracts.AirnodeRrp);
  expect(preInvokelogNames).toEqual([
    'SetAirnodeXpub',
    'SetSponsorshipStatus',
    'CreatedTemplate',
    'MadeTemplateRequest',
    'MadeFullRequest',
  ]);

  await startCoordinator();

  const postInvokeLogs = await fetchAllLogs(provider, deployment.contracts.AirnodeRrp);
  expect(postInvokeLogs.map(({ name }) => name)).toEqual([
    'SetAirnodeXpub',
    'SetSponsorshipStatus',
    'CreatedTemplate',
    'MadeTemplateRequest',
    'MadeFullRequest',
    'FailedRequest',
    'FulfilledRequest',
  ]);

  const failedRequest = filterLogsByName(postInvokeLogs, 'FailedRequest')[0];
  const templateRequest = filterLogsByName(postInvokeLogs, 'MadeTemplateRequest')[0];
  expectSameRequestId(templateRequest, failedRequest);

  const fulfilledRequest = filterLogsByName(postInvokeLogs, 'FulfilledRequest')[0];
  const fullRequest = filterLogsByName(postInvokeLogs, 'MadeFullRequest')[0];
  expectSameRequestId(fulfilledRequest, fullRequest);
});
