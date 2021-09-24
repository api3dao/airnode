import { execSync } from 'child_process';
import { encode } from '@api3/airnode-abi';
import { ethers } from 'ethers';
import {
  getAirnodeWallet,
  getAirnodeXpub,
  getDeployedContract,
  getProvider,
  readConfig,
  readIntegrationInfo,
} from '../../src';

const coinLabel = 'Ethereum';
const coinId = coinLabel.toLowerCase();

export async function makeRequest(): Promise<string> {
  const integrationInfo = readIntegrationInfo();
  const requester = await getDeployedContract(`contracts/${integrationInfo.integration}/Requester.sol`);
  const airnodeRrp = await getDeployedContract('@api3/protocol/contracts/rrp/AirnodeRrp.sol');
  const airnodeWallet = getAirnodeWallet();
  const sponsor = ethers.Wallet.fromMnemonic(integrationInfo.mnemonic);
  const endpointId = readConfig().triggers.rrp[0].endpointId;

  const args = [
    `--providerUrl ${integrationInfo.providerUrl}`,
    `--airnodeRrp ${airnodeRrp.address}`,
    `--airnodeAddress ${airnodeWallet.address}`,
    `--sponsorAddress ${sponsor.address}`,
    `--xpub ${getAirnodeXpub(airnodeWallet)}`,
  ];
  const output = execSync(`yarn api3-admin derive-sponsor-wallet-address ${args.join(' ')}`).toString();
  const sponsorWalletAddress = output.split('Sponsor wallet address:')[1].trim();

  const receipt = await requester.makeRequest(
    airnodeWallet.address,
    endpointId,
    sponsor.address,
    sponsorWalletAddress,
    encode([{ name: 'coinId', type: 'bytes32', value: coinId }])
  );

  return new Promise((resolve) =>
    getProvider().once(receipt.hash, (tx) => {
      const parsedLog = airnodeRrp.interface.parseLog(tx.logs[0]);
      resolve(parsedLog.args.requestId);
    })
  );
}

export async function printResponse(requestId: string) {
  const integrationInfo = readIntegrationInfo();
  const requester = await getDeployedContract(`contracts/${integrationInfo.integration}/Requester.sol`);

  console.log(`${coinLabel} price is ${await requester.fulfilledData(requestId)} USD`);
}
