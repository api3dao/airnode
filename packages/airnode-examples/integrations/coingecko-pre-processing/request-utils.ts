import { encode } from '@api3/airnode-abi';
import { deriveAirnodeXpub, deriveSponsorWalletAddress } from '@api3/airnode-admin';
import { ethers } from 'ethers';
import { cliPrint, getAirnodeWallet, getDeployedContract, readConfig, readIntegrationInfo } from '../../src';

const coinLabel = 'Ethereum';
const coinId = coinLabel.toLowerCase();
const date = '2021-11-30';

const getEncodedParameters = () =>
  encode([
    { name: 'coinId', type: 'string32', value: coinId },
    { name: 'unixTimestamp', type: 'int256', value: Date.parse(date) / 1000 },
  ]);

export const makeRequest = async () => {
  const integrationInfo = readIntegrationInfo();
  const requester = await getDeployedContract(`contracts/${integrationInfo.integration}/Requester.sol`);
  const airnodeWallet = getAirnodeWallet();
  const sponsor = ethers.Wallet.fromMnemonic(integrationInfo.mnemonic);
  const endpointId = readConfig().triggers.rrp[0].endpointId;
  const sponsorWalletAddress = await deriveSponsorWalletAddress(
    deriveAirnodeXpub(airnodeWallet.mnemonic.phrase),
    airnodeWallet.address,
    sponsor.address
  );

  // Trigger the Airnode request
  return requester.makeRequest(
    airnodeWallet.address,
    endpointId,
    sponsor.address,
    sponsorWalletAddress,
    getEncodedParameters()
  );
};

export const printResponse = async (requestId: string) => {
  const integrationInfo = readIntegrationInfo();
  const requester = await getDeployedContract(`contracts/${integrationInfo.integration}/Requester.sol`);

  // Divided by 1e6, because the response value is multiplied with 1e6 by Airnode
  cliPrint.info(`${coinLabel} price was ${(await requester.fulfilledData(requestId)) / 1e6} USD at ${date}`);
};
