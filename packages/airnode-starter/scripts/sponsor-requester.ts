import { spawnSync } from 'child_process';
import { getAirnodeWallet, getAirnodeXpub, getDeployedContract, readIntegrationInfo } from '../src';

async function main() {
  const integrationInfo = readIntegrationInfo();
  const airnodeRrp = await getDeployedContract('@api3/protocol/contracts/rrp/AirnodeRrp.sol');
  const requester = await getDeployedContract(`contracts/${integrationInfo.integration}/Requester.sol`);
  const airnodeWallet = getAirnodeWallet();

  const args = [
    `--providerUrl ${integrationInfo.providerUrl}`,
    `--airnodeRrp ${airnodeRrp.address}`,
    `--xpub ${getAirnodeXpub(airnodeWallet)}`,
    `--requesterAddress ${requester.address}`,
    `--mnemonic "${integrationInfo.mnemonic}"`,
  ];
  spawnSync(`yarn api3-admin sponsor-requester ${args.join(' ')}`, { shell: true, stdio: 'inherit' }).toString();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
