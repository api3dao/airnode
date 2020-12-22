import * as deploy from '../evm/deploy';
import * as io from '../evm/io';

async function main() {
  const config = io.loadConfig();

  const state1 = deploy.buildState(config);

  console.log('--> Deploying contracts...');
  const state2 = await deploy.deployAirnode(state1);
  const state3 = await deploy.deployConvenience(state2);
  const state4 = await deploy.deployClients(state3);
  const state5 = await deploy.deployAuthorizers(state4);

  console.log('--> Assigning wallets...');
  const state6 = await deploy.assignProviderAccounts(state5);
  const state7 = await deploy.assignRequesterAccounts(state6);
  const state8 = await deploy.assignDesignatedWallets(state7);

  console.log('--> Funding wallets...');
  const state9 = await deploy.fundProviderAccounts(state8);
  const state10 = await deploy.fundRequesterAccounts(state9);
  const state11 = await deploy.fundDesignatedWallets(state10);

  console.log('--> Creating API providers...');
  const state12 = await deploy.createProviders(state11);

  console.log('--> Authorizing endpoints...');
  const state13 = await deploy.authorizeEndpoints(state12);

  console.log('--> Endorsing client contracts...');
  const state14 = await deploy.endorseClients(state13);

  console.log('--> Creating templates...');
  const state15 = await deploy.createTemplates(state14);

  console.log('--> Deployment successful!');

  console.log('--> Saving deployment records...');
  io.saveDeployment(state15);
  console.log('--> Deployment records saved...');

  return state15;
}

main();
