import { logger } from '@api3/airnode-utilities';
import * as deploy from '../evm/deploy';
import * as io from '../evm/io';

async function run() {
  logger.log('--> Loading configuration...');
  const config = io.loadConfig();

  const state1 = deploy.buildDeployState(config);

  logger.log('--> Deploying contracts...');
  const state2 = await deploy.deployAirnodeRrp(state1);
  const state3 = await deploy.deployRequesters(state2);
  const state4 = await deploy.deployAccessControlRegistry(state3);
  const state5 = await deploy.deployAuthorizers(state4);

  logger.log('--> Assigning wallets...');
  const state6 = await deploy.assignAirnodeAccounts(state5);
  const state7 = await deploy.assignRequesterAccounts(state6);
  const state8 = await deploy.assignSponsorWallets(state7);

  logger.log('--> Funding wallets...');
  const state9 = await deploy.fundAirnodeAccounts(state8);
  const state10 = await deploy.fundSponsorAccounts(state9);
  const state11 = await deploy.fundSponsorWallets(state10);

  logger.log('--> Sponsoring requester contracts...');
  const state12 = await deploy.sponsorRequesters(state11);

  logger.log('--> Creating templates...');
  const state13 = await deploy.createTemplates(state12);

  logger.log('--> Deployment successful!');

  logger.log('--> Saving deployment...');
  io.saveDeployment(state13);
  logger.log('--> Deployment saved!');

  return state13;
}

run();
