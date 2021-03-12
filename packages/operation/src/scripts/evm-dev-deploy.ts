import * as deploy from '../evm/deploy';
import * as io from '../evm/io';

async function run() {
  console.log('--> Loading configuration...');
  const config = io.loadConfig();

  const state1 = deploy.buildDeployState(config);

  console.log('--> Deploying contracts...');
  const state2 = await deploy.deployAirnodeRrp(state1);
  const state3 = await deploy.deployClients(state2);
  const state4 = await deploy.deployAuthorizers(state3);

  console.log('--> Assigning wallets...');
  const state5 = await deploy.assignProviderAccounts(state4);
  const state6 = await deploy.assignRequesterAccounts(state5);
  const state7 = await deploy.assignDesignatedWallets(state6);

  console.log('--> Funding wallets...');
  const state8 = await deploy.fundProviderAccounts(state7);
  const state9 = await deploy.fundRequesterAccounts(state8);
  const state10 = await deploy.fundDesignatedWallets(state9);

  console.log('--> Setting API provider parameters...');
  const state11 = await deploy.setProviderParameters(state10);

  console.log('--> Endorsing client contracts...');
  const state12 = await deploy.endorseClients(state11);

  console.log('--> Creating templates...');
  const state13 = await deploy.createTemplates(state12);

  console.log('--> Deployment successful!');

  console.log('--> Saving deployment...');
  io.saveDeployment(state13);
  console.log('--> Deployment saved!');

  return state13;
}

run();
