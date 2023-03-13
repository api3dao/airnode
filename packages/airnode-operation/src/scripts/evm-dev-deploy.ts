import { logger } from '@api3/airnode-utilities';
import * as deploy from '../evm/deploy';
import * as io from '../evm/io';

async function run() {
  logger.log('--> Loading configuration...');
  const config = io.loadConfig();

  let state = deploy.buildDeployState(config);

  logger.log('--> Deploying contracts...');
  state = await deploy.deployAirnodeRrp(state);
  state = await deploy.deployRequesters(state);
  state = await deploy.deployAccessControlRegistry(state);
  state = await deploy.deployAuthorizers(state);
  state = await deploy.deployErc721s(state);

  logger.log('--> Assigning wallets...');
  state = await deploy.assignAirnodeAccounts(state);
  state = await deploy.assignRequesterAccounts(state);
  state = await deploy.assignSponsorWallets(state);

  logger.log('--> Funding wallets...');
  state = await deploy.fundAirnodeAccounts(state);
  state = await deploy.fundSponsorAccounts(state);
  state = await deploy.fundSponsorWallets(state);

  logger.log('--> Sponsoring requester contracts...');
  state = await deploy.sponsorRequesters(state);

  logger.log('--> Creating templates...');
  state = await deploy.createTemplates(state);

  logger.log('--> Deployment successful!');

  logger.log('--> Saving deployment...');
  io.saveDeployment(state);
  logger.log('--> Deployment saved!');

  return state;
}

run();
