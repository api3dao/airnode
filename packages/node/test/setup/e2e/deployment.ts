import * as operation from '@api3/operation';

export async function deployAirnodeRrp(config: operation.Config): Promise<operation.Deployment> {
  const state1 = operation.buildDeployState(config);

  // Deploy contracts
  const state2 = await operation.deployAirnodeRrp(state1);
  const state3 = await operation.deployRequesters(state2);
  const state4 = await operation.deployAccessControlRegistry(state3);
  const state5 = await operation.deployAuthorizers(state4);

  // Assign wallets
  const state6 = await operation.assignAirnodeAccounts(state5);
  const state7 = await operation.assignRequesterAccounts(state6);
  const state8 = await operation.assignSponsorWallets(state7);

  // Fund wallets
  const state9 = await operation.fundAirnodeAccounts(state8);
  const state10 = await operation.fundSponsorAccounts(state9);
  const state11 = await operation.fundSponsorWallets(state10);

  // Sponsor requester contracts
  const state12 = await operation.sponsorRequesters(state11);

  // Create templates
  const state13 = await operation.createTemplates(state12);

  const deployment = operation.buildSaveableDeployment(state13);

  return deployment;
}

export async function makeRequests(config: operation.Config, deployment: operation.Deployment): Promise<void> {
  const state1 = operation.buildRequestsState(config, deployment);
  await operation.makeRequests(state1);
}
