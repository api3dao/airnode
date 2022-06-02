import { deriveAirnodeXpub, deriveSponsorWalletAddress } from '@api3/airnode-admin';
import { ethers } from 'ethers';
import { cliPrint, getAirnodeWallet, getDeployedContract, readConfig, readIntegrationInfo } from '../../src';

const getEncodedParameters = () => '0x';

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
  cliPrint.info(`Ethereum price is ${(await requester.fulfilledData(requestId)) / 1e6} USD`);
};
