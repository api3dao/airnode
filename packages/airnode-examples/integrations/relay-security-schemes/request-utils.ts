import { ethers } from 'ethers';
import { cliPrint, getDeployedContract, readIntegrationInfo } from '../../src';

export const getEncodedParameters = () => {
  return '0x';
};

export const printResponse = async (requestId: string) => {
  const integrationInfo = readIntegrationInfo();
  const requester = await getDeployedContract(`contracts/${integrationInfo.integration}/Requester.sol`);

  const requesterAddress = await requester.requesterAddress(requestId);
  const sponsorAddress = await requester.sponsorAddress(requestId);
  const sponsorWalletAddress = await requester.sponsorWalletAddress(requestId);
  const chainId = await requester.chainId(requestId);
  const chainType = ethers.utils.parseBytes32String(await requester.chainType(requestId));

  cliPrint.info(`The following was successfully relayed:
    requesterAddress: ${requesterAddress}
    sponsorAddress: ${sponsorAddress}
    sponsorWalletAddress: ${sponsorWalletAddress}
    chainId: ${chainId}
    chainType: ${chainType}`);
};
