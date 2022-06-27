import { startCoordinator } from '../../src/workers/local-handlers';
import { deployAirnodeAndMakeRequests, fetchAllLogNames, increaseTestTimeout } from '../setup/e2e';

increaseTestTimeout();

it('does not process requests twice', async () => {
  const { provider, deployment } = await deployAirnodeAndMakeRequests(__filename);

  const preInvokeExpectedLogs = ['MadeTemplateRequest', 'MadeFullRequest'];
  const preInvokeLogs = await fetchAllLogNames(provider, deployment.contracts.AirnodeRrp);
  expect(preInvokeLogs).toEqual(expect.arrayContaining(preInvokeExpectedLogs));

  await startCoordinator();

  const postInvokeExpectedLogs = [...preInvokeExpectedLogs, 'FulfilledRequest', 'FulfilledRequest'];
  const postInvokeLogs = await fetchAllLogNames(provider, deployment.contracts.AirnodeRrp);
  expect(postInvokeLogs).toEqual(expect.arrayContaining(postInvokeExpectedLogs));

  await startCoordinator();

  // Verify that requests are not processed multiple times
  const afterPostInvokeLogs = await fetchAllLogNames(provider, deployment.contracts.AirnodeRrp);
  expect(afterPostInvokeLogs).toEqual(postInvokeLogs);
});
