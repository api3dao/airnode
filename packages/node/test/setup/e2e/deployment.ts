import * as operation from '@airnode/operation';

export async function deployAirnode(config: operation.Config): Promise<operation.Deployment> {
  const state1 = operation.buildDeployState(config);

  // Deploy contracts
  const state2 = await operation.deployAirnode(state1);
  const state3 = await operation.deployConvenience(state2);
  const state4 = await operation.deployClients(state3);
  const state5 = await operation.deployAuthorizers(state4);

  // Assign wallets
  const state6 = await operation.assignProviderAccounts(state5);
  const state7 = await operation.assignRequesterAccounts(state6);
  const state8 = await operation.assignDesignatedWallets(state7);

  // Fund wallets
  const state9 = await operation.fundProviderAccounts(state8);
  const state10 = await operation.fundRequesterAccounts(state9);
  const state11 = await operation.fundDesignatedWallets(state10);

  // Create API providers
  const state12 = await operation.createProviders(state11);

  // Endorse client contracts
  const state13 = await operation.endorseClients(state12);

  // Create templates
  const state14 = await operation.createTemplates(state13);

  const deployment = operation.buildSaveableDeployment(state14);

  return deployment;
}

export async function makeRequests(config: operation.Config, deployment: operation.Deployment): Promise<void> {
  const state1 = operation.buildRequestsState(config, deployment);
  await operation.makeRequests(state1);
}
