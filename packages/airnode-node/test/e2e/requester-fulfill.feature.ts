import compact from 'lodash/compact';
import { BLOCK_COUNT_HISTORY_LIMIT } from '../../src';
import * as local from '../../src/workers/local-handlers';
import { operation } from '../fixtures';
import {
  fetchAllLogNames,
  fetchAllLogs,
  fetchProviderLogs,
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

  await local.startCoordinator();

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

  await local.startCoordinator();

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

it('submits fulfillment with the gas price overridden', async () => {
  const requestedGasPrice = '99999999999'; // wei
  const overrideParameters = [
    { type: 'string32', name: 'from', value: 'ETH' },
    { type: 'string32', name: 'to', value: 'USD' },
    { type: 'string32', name: '_type', value: 'int256' },
    { type: 'string32', name: '_path', value: 'result' },
    { type: 'string32', name: '_times', value: '100000' },
    { type: 'string32', name: '_gasPrice', value: requestedGasPrice },
  ];
  const requests = [operation.buildFullRequest({ parameters: overrideParameters })];
  const { provider, deployment } = await deployAirnodeAndMakeRequests(__filename, requests);

  await local.startCoordinator();

  const logs = await fetchProviderLogs(provider, deployment.contracts.AirnodeRrp);

  const filteredTxs = compact(
    await Promise.all(
      logs.map(async (log) => {
        const tx = await provider.getTransaction(log.transactionHash);
        if (tx.gasPrice && tx.gasPrice.toString() === requestedGasPrice) {
          return tx;
        }
        return null;
      })
    )
  );

  expect(filteredTxs.length).toEqual(1);
  expect(filteredTxs[0]!.gasPrice!.toString()).toEqual(requestedGasPrice);
});

it('submits fulfillment only if minConfirmations is overridden by request parameter', async () => {
  const overrideParameters = [
    { type: 'string32', name: 'from', value: 'ETH' },
    { type: 'string32', name: 'to', value: 'USD' },
    { type: 'string32', name: '_type', value: 'int256' },
    { type: 'string32', name: '_path', value: 'result' },
    { type: 'string32', name: '_times', value: '100000' },
    { type: 'string32', name: '_minConfirmations', value: '0' },
  ];
  const requests = [operation.buildFullRequest({ parameters: overrideParameters })];
  const { provider, deployment } = await deployAirnodeAndMakeRequests(__filename, requests);

  const preInvokeExpectedLogs = ['SetSponsorshipStatus', 'SetSponsorshipStatus', 'CreatedTemplate', 'MadeFullRequest'];
  const preInvokelogNames = await fetchAllLogNames(provider, deployment.contracts.AirnodeRrp);
  expect(preInvokelogNames).toEqual(preInvokeExpectedLogs);

  // Set chains[n].minConfirmations such that the request will only be fulfilled if the
  // value is overridden by _minConfirmations in the request
  const config = local.loadConfig();
  config.chains[0].minConfirmations = BLOCK_COUNT_HISTORY_LIMIT - 1;

  jest.spyOn(local, 'loadConfig').mockReturnValueOnce(config);

  await local.startCoordinator();

  const postInvokeExpectedLogs = [...preInvokeExpectedLogs, 'FulfilledRequest'];
  const postInvokeLogs = await fetchAllLogs(provider, deployment.contracts.AirnodeRrp);
  expect(postInvokeLogs.map(({ name }) => name)).toEqual(postInvokeExpectedLogs);

  const fulfilledRequest = filterLogsByName(postInvokeLogs, 'FulfilledRequest')[0];
  const fullRequest = filterLogsByName(postInvokeLogs, 'MadeFullRequest')[0];
  expectSameRequestId(fulfilledRequest, fullRequest);
});
