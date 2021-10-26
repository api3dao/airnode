import { getDeployedContract, readIntegrationInfo, runAndHandleErrors, runShellCommand } from '../src';

const main = async () => {
  const integrationInfo = readIntegrationInfo();
  const airnodeRrp = await getDeployedContract('@api3/protocol/contracts/rrp/AirnodeRrp.sol');
  const requester = await getDeployedContract(`contracts/${integrationInfo.integration}/Requester.sol`);

  const command = [
    `yarn api3-admin sponsor-requester`,
    `--provider-url ${integrationInfo.providerUrl}`,
    `--airnode-rrp ${airnodeRrp.address}`,
    `--requester-address ${requester.address}`,
    `--sponsor-mnemonic "${integrationInfo.mnemonic}"`,
  ].join(' ');
  runShellCommand(command);
};

runAndHandleErrors(main);
