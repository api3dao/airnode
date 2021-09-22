import { execSync } from 'child_process';
import hre from 'hardhat';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-deploy';
import { encode } from '@api3/airnode-abi';
import { ethers } from 'ethers';
import { readConfig, readIntegrationInfo, readReceipt } from '../src';

const getContract = async (name: string) => {
  const deployment = await hre.deployments.get(name);
  const contract = await hre.ethers.getContractAt(deployment.abi, deployment.address);

  return contract;
};

async function makeRequest(coinId: string): Promise<string> {
  const exampleRequester = await getContract('ExampleRequester');
  const airnodeRrp = await getContract('AirnodeRrp');
  const airnodeWallet = readReceipt().airnodeWallet;
  const integrationInfo = readIntegrationInfo();
  const sponsor = ethers.Wallet.fromMnemonic(integrationInfo!.mnemonic);
  const endpointId = readConfig().triggers.rrp[0].endpointId;

  const args = [
    `--providerUrl ${integrationInfo?.providerUrl}`,
    `--airnodeRrp ${airnodeRrp.address}`,
    `--airnodeAddress ${airnodeWallet.airnodeAddress}`,
    `--sponsorAddress ${sponsor.address}`,
    `--xpub ${airnodeWallet.xpub}`,
  ];
  const output = execSync(`yarn admin derive-sponsor-wallet-address ${args.join(' ')}`).toString();
  const sponsorWalletAddress = output.split('Sponsor wallet address:')[1].trim();

  // address airnode,
  // bytes32 endpointId,
  // address sponsor,
  // address sponsorWallet,
  // bytes calldata parameters
  const receipt = await exampleRequester.makeRequest(
    airnodeWallet.airnodeAddress,
    endpointId,
    sponsor.address,
    sponsorWalletAddress,
    encode([{ name: 'coinId', type: 'bytes32', value: coinId }])
  );

  return new Promise((resolve) =>
    hre.ethers.provider.once(receipt.hash, (tx) => {
      const parsedLog = airnodeRrp.interface.parseLog(tx.logs[0]);
      resolve(parsedLog.args.requestId);
    })
  );
}

async function fulfilled(requestId: string) {
  const airnodeRrp = await getContract('AirnodeRrp');
  return new Promise((resolve) =>
    hre.ethers.provider.once(airnodeRrp.filters.FulfilledRequest(null, requestId), resolve)
  );
}

async function main() {
  const coinLabel = 'Ethereum';
  const coinId = coinLabel.toLowerCase();

  console.log('Making the request...');
  const requestId = await makeRequest(coinId);
  console.log(`Made the request with ID ${requestId}.\nWaiting for it to be fulfilled...`);

  await fulfilled(requestId);
  console.log('Request fulfilled');

  const exampleRequester = await getContract('ExampleRequester');
  console.log(`${coinLabel} price is ${await exampleRequester.fulfilledData(requestId)} USD`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
