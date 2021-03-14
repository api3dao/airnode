import * as operation from '@airnode/operation';

export async function deployAirnodeRrp(config: operation.Config): Promise<operation.Deployment> {
  const state1 = operation.buildDeployState(config);

  // Deploy contracts
  const state2 = await operation.deployAirnodeRrp(state1);
  const state3 = await operation.deployClients(state2);
  const state4 = await operation.deployAuthorizers(state3);

  // Assign wallets
  const state5 = await operation.assignAirnodeAccounts(state4);
  const state6 = await operation.assignRequesterAccounts(state5);
  const state7 = await operation.assignDesignatedWallets(state6);

  // Fund wallets
  const state8 = await operation.fundAirnodeAccounts(state7);
  const state9 = await operation.fundRequesterAccounts(state8);
  const state10 = await operation.fundDesignatedWallets(state9);

  // Set Airnode parameters
  const state11 = await operation.setAirnodeParameters(state10);

  // Endorse client contracts
  const state12 = await operation.endorseClients(state11);

  // Create templates
  const state13 = await operation.createTemplates(state12);

  const deployment = operation.buildSaveableDeployment(state13);

  return deployment;
}

export async function makeRequests(config: operation.Config, deployment: operation.Deployment): Promise<void> {
  const state1 = operation.buildRequestsState(config, deployment);
  await operation.makeRequests(state1);
}
