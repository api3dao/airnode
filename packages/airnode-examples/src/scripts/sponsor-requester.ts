import { sponsorRequester, useAirnodeRrp } from '@api3/airnode-admin';
import { cliPrint, getDeployedContract, getUserWallet, readIntegrationInfo, runAndHandleErrors } from '../';

const main = async () => {
  const integrationInfo = readIntegrationInfo();
  const airnodeRrp = await getDeployedContract('@api3/airnode-protocol/contracts/rrp/AirnodeRrpV0.sol');
  const requester = await getDeployedContract(`contracts/${integrationInfo.integration}/Requester.sol`);
  const userWallet = getUserWallet();

  // NOTE: When doing this manually, you can use the 'sponsor-requester' command from the admin CLI package
  const requesterAddress = await sponsorRequester(useAirnodeRrp(airnodeRrp).connect(userWallet), requester.address);
  cliPrint.info(`Requester address: ${requesterAddress} is now sponsored`);
};

runAndHandleErrors(main);
