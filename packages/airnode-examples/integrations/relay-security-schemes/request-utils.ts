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

  const relayedRequesterAddress = await requester.relayedRequesterAddress(requestId);
  const relayedSponsorAddress = await requester.relayedSponsorAddress(requestId);
  const relayedSponsorWalletAddress = await requester.relayedSponsorWalletAddress(requestId);
  const relayedChainId = await requester.relayedChainId(requestId);
  const relayedRequestId = await requester.relayedRequestId(requestId);
  // decode and extract chain from API response `chainType=evm;`
  const relayedChainType = ethers.utils
    .parseBytes32String(await requester.relayedChainType(requestId))
    .split('=')[1]
    .split(';')[0];

  cliPrint.info(`
For requestId: ${requestId}
the following properties were successfully relayed:

  requesterAddress: ${relayedRequesterAddress}
  sponsorAddress: ${relayedSponsorAddress}
  sponsorWalletAddress: ${relayedSponsorWalletAddress}
  chainId: ${relayedChainId}
  chainType: ${relayedChainType}
  requestId: ${relayedRequestId}
  `);
};
