import * as operation from '@api3/airnode-operation';

// TODO: Why we have a similar function in evm-dev-deploy.ts?
export async function deployAirnodeRrp(config: operation.Config): Promise<operation.Deployment> {
  let state = operation.buildDeployState(config);

  // Deploy contracts
  state = await operation.deployAirnodeRrp(state);
  state = await operation.deployRequesters(state);
  state = await operation.deployAccessControlRegistry(state);
  state = await operation.deployAuthorizers(state);
  state = await operation.deployErc721s(state);
  state = await operation.deployRequesterAuthorizerWithErc721(state);

  // Assign wallets
  state = operation.assignAirnodeAccounts(state);
  state = operation.assignRequesterAccounts(state);
  state = operation.assignSponsorWallets(state);

  // Fund wallets
  state = await operation.fundAirnodeAccounts(state);
  state = await operation.fundSponsorAccounts(state);
  state = await operation.fundSponsorWallets(state);

  // Sponsor requester contracts
  state = await operation.sponsorRequesters(state);

  // Create templates
  state = await operation.createTemplates(state);

  const deployment = operation.buildSaveableDeployment(state);

  return deployment;
}

export async function makeRequests(config: operation.Config, deployment: operation.Deployment): Promise<void> {
  const state1 = operation.buildRequestsState(config, deployment);
  await operation.makeRequests(state1);
}
