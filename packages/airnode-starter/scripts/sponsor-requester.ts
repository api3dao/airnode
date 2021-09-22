import { join } from 'path';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-deploy';
import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import hre from 'hardhat';
import { readIntegrationInfo } from '../src';

const getContract = async (name: string) => {
  const deployment = await hre.deployments.get(name);
  const contract = await hre.ethers.getContractAt(deployment.abi, deployment.address);

  return contract;
};

export const readReceipt = () => {
  const integrationInfo = readIntegrationInfo();

  const receipt = JSON.parse(
    readFileSync(join(__dirname, `../integrations/${integrationInfo?.integration}/receipt.json`)).toString()
  );
  return receipt;
};

async function main() {
  const integrationInfo = readIntegrationInfo();
  const airnodeRrp = await getContract('AirnodeRrp');
  const exampleRequester = await getContract('ExampleRequester');
  const airnodeWallet = readReceipt().airnodeWallet;

  const args = [
    `--providerUrl ${integrationInfo?.providerUrl}`,
    `--airnodeRrp ${airnodeRrp.address}`,
    `--xpub ${airnodeWallet.xpub}`,
    `--requesterAddress ${exampleRequester.address}`,
    `--mnemonic "${integrationInfo?.mnemonic}"`,
  ];
  spawnSync(`yarn admin sponsor-requester ${args.join(' ')}`, { shell: true, stdio: 'inherit' }).toString();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
