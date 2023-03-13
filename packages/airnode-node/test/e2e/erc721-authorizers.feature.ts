import { RequesterAuthorizerWithErc721Factory, AccessControlRegistryFactory } from '@api3/airnode-protocol';
import * as local from '../../src/workers/local-handlers';
import { operation } from '../fixtures';
import { fetchAllLogs, deployAirnodeAndMakeRequests, increaseTestTimeout } from '../setup/e2e';

increaseTestTimeout();

it('deploys a requesterAuthorizerWithErc721 contract and authorizes requests', async () => {
  const { deployment, provider } = await deployAirnodeAndMakeRequests(__filename, [operation.buildFullRequest()]);
  const deployer = provider.getSigner();

  const AccessControlRegistry = new AccessControlRegistryFactory(deployer);
  const accessControlRegistry = await AccessControlRegistry.deploy();
  await accessControlRegistry.deployed();

  const RequesterAuthorizersWithErc721 = new RequesterAuthorizerWithErc721Factory(deployer);
  const requesterAuthorizersWithErc721 = await RequesterAuthorizersWithErc721.deploy(
    accessControlRegistry.address,
    'RequesterAuthorizerWithErc721 admin'
  );
  await requesterAuthorizersWithErc721.deployed();

  // TODO - create ERC721, transfer token to requesterAuthorizersWithErc721

  const config = local.loadConfig();

  // Configure authorizers so that only the requesterAuthorizersWithErc721 can authorize
  // An empty requesterEndpointAuthorizers array means that no authorizers are required hence the 0x0...
  config.chains[0].authorizers.requesterEndpointAuthorizers = ['0x0000000000000000000000000000000000000000'];
  config.chains[0].authorizers.crossChainRequesterAuthorizers = [];
  config.chains[0].authorizers.crossChainRequesterAuthorizersWithErc721 = [];
  config.chains[0].authorizers.requesterAuthorizersWithErc721 = [
    {
      erc721s: ['TODOaddressOfERC721above'],
      RequesterAuthorizerWithErc721: requesterAuthorizersWithErc721.address,
    },
  ];

  jest.spyOn(local, 'loadConfig').mockReturnValueOnce(config);
  const preInvokeExpectedLogs = ['SetSponsorshipStatus', 'SetSponsorshipStatus', 'CreatedTemplate', 'MadeFullRequest'];

  await local.startCoordinator();

  // FulfilledRequest is absent if the request was not authorized
  const postInvokeExpectedLogs = [...preInvokeExpectedLogs, 'FulfilledRequest'];
  const postInvokeLogs = await fetchAllLogs(provider, deployment.contracts.AirnodeRrp);
  expect(postInvokeLogs.map(({ name }) => name)).toEqual(postInvokeExpectedLogs);
});
