import * as operation from '@api3/operation';

export async function deployAirnodeRrp(config: operation.Config): Promise<operation.Deployment> {
  const state1 = operation.buildDeployState(config);

  // Deploy contracts
  const state2 = await operation.deployAirnodeRrp(state1);
  const state3 = await operation.deployRequesters(state2);
  const state4 = await operation.deployAuthorizers(state3);

  // Assign wallets
  const state5 = await operation.assignAirnodeAccounts(state4);
  const state6 = await operation.assignRequesterAccounts(state5);
  const state7 = await operation.assignSponsorWallets(state6);

  // Fund wallets
  const state8 = await operation.fundAirnodeAccounts(state7);
  const state9 = await operation.fundSponsorAccounts(state8);
  const state10 = await operation.fundSponsorWallets(state9);

  // Set Airnode xpub
  const state11 = await operation.setAirnodeXpub(state10);

  // Endorse requester contracts
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
