import { log } from '@api3/airnode-utilities';
import * as deploy from '../evm/deploy';
import * as io from '../evm/io';

async function run() {
  log('--> Loading configuration...');
  const config = io.loadConfig();

  const state1 = deploy.buildDeployState(config);

  log('--> Deploying contracts...');
  const state2 = await deploy.deployAirnodeRrp(state1);
  const state3 = await deploy.deployRequesters(state2);
  const state4 = await deploy.deployAccessControlRegistry(state3);
  const state5 = await deploy.deployAuthorizers(state4);

  log('--> Assigning wallets...');
  const state6 = await deploy.assignAirnodeAccounts(state5);
  const state7 = await deploy.assignRequesterAccounts(state6);
  const state8 = await deploy.assignSponsorWallets(state7);

  log('--> Funding wallets...');
  const state9 = await deploy.fundAirnodeAccounts(state8);
  const state10 = await deploy.fundSponsorAccounts(state9);
  const state11 = await deploy.fundSponsorWallets(state10);

  log('--> Sponsoring requester contracts...');
  const state12 = await deploy.sponsorRequesters(state11);

  log('--> Creating templates...');
  const state13 = await deploy.createTemplates(state12);

  log('--> Deployment successful!');

  log('--> Saving deployment...');
  io.saveDeployment(state13);
  log('--> Deployment saved!');

  return state13;
}

run();
