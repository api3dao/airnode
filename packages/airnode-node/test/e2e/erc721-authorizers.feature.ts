import * as local from '../../src/workers/local-handlers';
import { operation } from '../fixtures';
import { increaseTestTimeout, deployAirnodeAndMakeRequests, fetchAllLogNames } from '../setup/e2e';

increaseTestTimeout();

it('deploys a requesterAuthorizerWithErc721 contract and authorizes requests', async () => {
  const requests = [operation.buildFullRequest()];
  const { provider, deployment } = await deployAirnodeAndMakeRequests(__filename, requests);

  // Configure authorizers so that only the requesterAuthorizersWithErc721 can authorize
  // An empty requesterEndpointAuthorizers array means that no authorizers are required hence the 0x0...
  const erc721Address = deployment.erc721s.MockErc721Factory;
  const requesterAuthorizersWithErc721Address = deployment.authorizers.MockRequesterAuthorizerWithErc721Factory;
  const config = local.loadConfig();
  config.chains[0].authorizers.requesterEndpointAuthorizers = [];
  config.chains[0].authorizers.crossChainRequesterAuthorizers = [];
  config.chains[0].authorizers.crossChainRequesterAuthorizersWithErc721 = [];
  config.chains[0].authorizers.requesterAuthorizersWithErc721 = [
    {
      erc721s: [erc721Address],
      RequesterAuthorizerWithErc721: requesterAuthorizersWithErc721Address,
    },
  ];
  jest.spyOn(local, 'loadConfig').mockReturnValueOnce(config);

  const preInvokeExpectedLogs = ['SetSponsorshipStatus', 'SetSponsorshipStatus', 'CreatedTemplate', 'MadeFullRequest'];
  const preInvokelogNames = await fetchAllLogNames(provider, deployment.contracts.AirnodeRrp);
  expect(preInvokelogNames).toEqual(preInvokeExpectedLogs);

  await local.startCoordinator();

  // FulfilledRequest is absent if the request was not authorized
  const postInvokeExpectedLogs = [...preInvokeExpectedLogs, 'FulfilledRequest'];
  const postInvokeLogs = await fetchAllLogNames(provider, deployment.contracts.AirnodeRrp);
  expect(postInvokeLogs).toEqual(postInvokeExpectedLogs);
});
