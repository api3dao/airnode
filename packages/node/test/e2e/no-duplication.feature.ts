import { startCoordinator } from '../../src/workers/local-handlers';
import { increaseTestTimeout, deployAirnodeAndMakeRequests, fetchAllLogNames } from '../setup/e2e';

it('does not process requests twice', async () => {
  increaseTestTimeout();
  const { provider, deployment } = await deployAirnodeAndMakeRequests(__filename);

  const preInvokeLogs = await fetchAllLogNames(provider, deployment.contracts.AirnodeRrp);
  expect(preInvokeLogs).toEqual([
    'SetAirnodeXpub',
    'SetSponsorshipStatus',
    'CreatedTemplate',
    'MadeTemplateRequest',
    'MadeFullRequest',
  ]);

  await startCoordinator();

  const postInvokeLogs = await fetchAllLogNames(provider, deployment.contracts.AirnodeRrp);
  expect(postInvokeLogs).toEqual([
    'SetAirnodeXpub',
    'SetSponsorshipStatus',
    'CreatedTemplate',
    'MadeTemplateRequest',
    'MadeFullRequest',
    'FulfilledRequest',
    'FulfilledRequest',
  ]);

  await startCoordinator();

  // Verify that requests are not processed multiple times
  const afterPostInvokeLogs = await fetchAllLogNames(provider, deployment.contracts.AirnodeRrp);
  expect(afterPostInvokeLogs).toEqual(postInvokeLogs);
});
