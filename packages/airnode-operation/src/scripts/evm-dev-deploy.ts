import * as deploy from '../evm/deploy';
import * as io from '../evm/io';

async function run() {
  console.log('--> Loading configuration...');
  const config = io.loadConfig();

  const state1 = deploy.buildDeployState(config);

  console.log('--> Deploying contracts...');
  const state2 = await deploy.deployAirnodeRrp(state1);
  const state3 = await deploy.deployRequesters(state2);
  const state4 = await deploy.deployAccessControlRegistry(state3);
  const state5 = await deploy.deployAuthorizers(state4);

  console.log('--> Assigning wallets...');
  const state6 = await deploy.assignAirnodeAccounts(state5);
  const state7 = await deploy.assignRequesterAccounts(state6);
  const state8 = await deploy.assignSponsorWallets(state7);

  console.log('--> Funding wallets...');
  const state9 = await deploy.fundAirnodeAccounts(state8);
  const state10 = await deploy.fundSponsorAccounts(state9);
  const state11 = await deploy.fundSponsorWallets(state10);

  console.log('--> Sponsoring requester contracts...');
  const state12 = await deploy.sponsorRequesters(state11);

  console.log('--> Creating templates...');
  const state13 = await deploy.createTemplates(state12);

  console.log('--> Deployment successful!');

  console.log('--> Saving deployment...');
  io.saveDeployment(state13);
  console.log('--> Deployment saved!');

  return state13;
}

run();
