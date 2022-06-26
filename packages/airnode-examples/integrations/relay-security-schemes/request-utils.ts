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

  const requesterAddress = await requester.requesterAddress(requestId);
  const sponsorAddress = await requester.sponsorAddress(requestId);
  const sponsorWalletAddress = await requester.sponsorWalletAddress(requestId);
  const chainId = await requester.chainId(requestId);
  const theRelayedRequestId = await requester.theRelayedRequestId(requestId);
  // decode and extract chain from API response `chainType=evm;`
  const chainType = ethers.utils
    .parseBytes32String(await requester.chainType(requestId))
    .split('=')[1]
    .split(';')[0];

  cliPrint.info(`
  For requestId: ${requestId}
  the following was successfully relayed:

    requesterAddress: ${requesterAddress}
    sponsorAddress: ${sponsorAddress}
    sponsorWalletAddress: ${sponsorWalletAddress}
    chainId: ${chainId}
    chainType: ${chainType}
    requestId: ${theRelayedRequestId}
    `);
};
