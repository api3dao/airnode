import {
  getAirnodeWallet,
  getAirnodeXpub,
  getDeployedContract,
  readIntegrationInfo,
  runAndHandleErrors,
  runShellCommand,
} from '../src';

const main = async () => {
  const integrationInfo = readIntegrationInfo();
  const airnodeRrp = await getDeployedContract('@api3/protocol/contracts/rrp/AirnodeRrp.sol');
  const requester = await getDeployedContract(`contracts/${integrationInfo.integration}/Requester.sol`);
  const airnodeWallet = getAirnodeWallet();

  const command = [
    `yarn api3-admin sponsor-requester`,
    `--providerUrl ${integrationInfo.providerUrl}`,
    `--airnodeRrp ${airnodeRrp.address}`,
    `--xpub ${getAirnodeXpub(airnodeWallet)}`,
    `--requesterAddress ${requester.address}`,
    `--mnemonic "${integrationInfo.mnemonic}"`,
  ].join(' ');
  runShellCommand(command);
};

runAndHandleErrors(main);
