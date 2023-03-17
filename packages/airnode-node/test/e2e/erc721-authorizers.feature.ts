import { erc721Mocks } from '@api3/airnode-protocol';
import { ethers } from 'ethers';
import * as local from '../../src/workers/local-handlers';
import { operation } from '../fixtures';
import { increaseTestTimeout, deployAirnodeAndMakeRequests, fetchAllLogNames } from '../setup/e2e';

increaseTestTimeout();

it('deploys a requesterAuthorizerWithErc721 contract and authorizes requests', async () => {
  const requests = [operation.buildFullRequest()];
  const { provider, deployment, deployerIndex, mnemonic } = await deployAirnodeAndMakeRequests(__filename, requests);
  const requesterAuthorizerWithErc721Address = deployment.contracts.RequesterAuthorizerWithErc721;

  // Send the NFT to the requester
  const deployer = provider.getSigner(deployerIndex);
  const onERC721ReceivedArguments = ethers.utils.defaultAbiCoder.encode(
    ['address', 'uint256', 'address'],
    [ethers.Wallet.fromMnemonic(mnemonic).address, 31337, deployment.requesters.MockRrpRequesterFactory]
  );
  await erc721Mocks.MockErc721Factory.connect(deployment.erc721s.MockErc721Factory, deployer)[
    'safeTransferFrom(address,address,uint256,bytes)'
  ](await deployer.getAddress(), requesterAuthorizerWithErc721Address, 0, onERC721ReceivedArguments);

  const erc721Address = deployment.erc721s.MockErc721Factory;

  const config = local.loadConfig();
  config.chains[0].authorizers.requesterEndpointAuthorizers = [];
  config.chains[0].authorizers.crossChainRequesterAuthorizers = [];
  config.chains[0].authorizers.crossChainRequesterAuthorizersWithErc721 = [];
  // Since requesterAuthorizersWithErc721 is not empty, only it can authorize
  config.chains[0].authorizers.requesterAuthorizersWithErc721 = [
    {
      erc721s: [erc721Address],
      RequesterAuthorizerWithErc721: requesterAuthorizerWithErc721Address,
    },
  ];
  jest.spyOn(local, 'loadConfig').mockReturnValueOnce(config);

  const preInvokeExpectedLogs = ['SetSponsorshipStatus', 'SetSponsorshipStatus', 'CreatedTemplate', 'MadeFullRequest'];
  const preInvokelogNames = await fetchAllLogNames(provider, deployment.contracts.AirnodeRrp);
  expect(preInvokelogNames).toEqual(preInvokeExpectedLogs);

  await local.startCoordinator();

  // FulfilledRequest being present indicates success
  const postInvokeExpectedLogs = [...preInvokeExpectedLogs, 'FulfilledRequest'];
  const postInvokeLogs = await fetchAllLogNames(provider, deployment.contracts.AirnodeRrp);
  expect(postInvokeLogs).toEqual(postInvokeExpectedLogs);
});
