import { encode } from '@api3/airnode-abi';
import { deriveAirnodeXpub, deriveSponsorWalletAddress } from '@api3/airnode-admin';
import { ethers } from 'ethers';
import { cliPrint, getAirnodeWallet, getDeployedContract, readConfig, readIntegrationInfo } from '../../src';

const getEncodedParameters = () =>
  encode([
    { name: 'coinIds', type: 'string32', value: 'bitcoin,ethereum' },
    { name: 'vsCurrency', type: 'string32', value: 'usd' },
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

  const data = await requester.fulfilledData(requestId);
  const { average, percentageChange } = data;

  // Divided by 1e8, because the response value is multiplied with 1e8 by Airnode
  cliPrint.info(`The average price of the coins = ${average / 1e8}`);
  cliPrint.info(`The average 30d percentage change = ${percentageChange / 1e8}`);
};
