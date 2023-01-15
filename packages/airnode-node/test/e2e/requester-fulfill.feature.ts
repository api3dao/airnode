import { startCoordinator } from '../../src/workers/local-handlers';
import { operation } from '../fixtures';
import {
  fetchAllLogNames,
  fetchAllLogs,
  fetchLastLog,
  filterLogsByName,
  deployAirnodeAndMakeRequests,
  increaseTestTimeout,
} from '../setup/e2e';

const expectSameRequestId = (req1: any, req2: any) => expect(req1.args.requestId).toBe(req2.args.requestId);

increaseTestTimeout();

it('should call fail function on AirnodeRrp contract and emit FailedRequest if requester contract fulfillment fails', async () => {
  const { deployment, provider } = await deployAirnodeAndMakeRequests(__filename, [
    operation.buildTemplateRequest({ fulfillFunctionName: 'fulfillAlwaysReverts' }),
    operation.buildFullRequest(),
  ]);

  const preInvokeExpectedLogs = ['MadeTemplateRequest', 'MadeFullRequest'];
  const preInvokeLogs = await fetchAllLogNames(provider, deployment.contracts.AirnodeRrp);
  expect(preInvokeLogs).toEqual(expect.arrayContaining(preInvokeExpectedLogs));

  await startCoordinator();

  const postInvokeExpectedLogs = [...preInvokeExpectedLogs, 'FailedRequest', 'FulfilledRequest'];
  const postInvokeLogs = await fetchAllLogs(provider, deployment.contracts.AirnodeRrp);
  expect(postInvokeLogs.map(({ name }) => name)).toEqual(expect.arrayContaining(postInvokeExpectedLogs));

  const failedRequest = filterLogsByName(postInvokeLogs, 'FailedRequest')[0];
  const templateRequest = filterLogsByName(postInvokeLogs, 'MadeTemplateRequest')[0];
  expectSameRequestId(templateRequest, failedRequest);

  const fulfilledRequest = filterLogsByName(postInvokeLogs, 'FulfilledRequest')[0];
  const fullRequest = filterLogsByName(postInvokeLogs, 'MadeFullRequest')[0];
  expectSameRequestId(fulfilledRequest, fullRequest);
});

it('should call fail function on AirnodeRrp contract and emit FailedRequest if requester contract fulfillment runs out of gas', async () => {
  const { deployment, provider } = await deployAirnodeAndMakeRequests(__filename, [
    operation.buildTemplateRequest({ fulfillFunctionName: 'fulfillAlwaysRunsOutOfGas' }),
    operation.buildFullRequest(),
  ]);

  const preInvokeExpectedLogs = ['MadeTemplateRequest', 'MadeFullRequest'];
  const preInvokelogNames = await fetchAllLogNames(provider, deployment.contracts.AirnodeRrp);
  expect(preInvokelogNames).toEqual(expect.arrayContaining(preInvokeExpectedLogs));

  await startCoordinator();

  const postInvokeExpectedLogs = [...preInvokeExpectedLogs, 'FailedRequest', 'FulfilledRequest'];
  const postInvokeLogs = await fetchAllLogs(provider, deployment.contracts.AirnodeRrp);
  expect(postInvokeLogs.map(({ name }) => name)).toEqual(expect.arrayContaining(postInvokeExpectedLogs));

  const failedRequest = filterLogsByName(postInvokeLogs, 'FailedRequest')[0];
  const templateRequest = filterLogsByName(postInvokeLogs, 'MadeTemplateRequest')[0];
  expectSameRequestId(templateRequest, failedRequest);

  const fulfilledRequest = filterLogsByName(postInvokeLogs, 'FulfilledRequest')[0];
  const fullRequest = filterLogsByName(postInvokeLogs, 'MadeFullRequest')[0];
  expectSameRequestId(fulfilledRequest, fullRequest);
});

it('submits fulfillment with overridden gas price', async () => {
  const requestedGasPrice = '999999';
  const gasOverrideParameters = [
    { type: 'string32', name: 'from', value: 'ETH' },
    { type: 'string32', name: 'to', value: 'USD' },
    { type: 'string32', name: '_type', value: 'int256' },
    { type: 'string32', name: '_path', value: 'result' },
    { type: 'string32', name: '_times', value: '100000' },
    { type: 'string32', name: '_gasPrice', value: requestedGasPrice },
  ];
  const requests = [operation.buildFullRequest({ parameters: gasOverrideParameters })];
  const { provider, deployment } = await deployAirnodeAndMakeRequests(__filename, requests);

  await startCoordinator();

  const fulfillmentLog = await fetchLastLog(provider, deployment.contracts.AirnodeRrp);
  const gasTx = await provider.getTransaction(fulfillmentLog.transactionHash);
  expect(gasTx.gasPrice!.toString()).toEqual(requestedGasPrice);
});
