import { encode } from '@api3/airnode-abi';
import { deriveAirnodeXpub, deriveSponsorWalletAddress } from '@api3/airnode-admin';
import { ethers } from 'ethers';
import { cliPrint, getAirnodeWallet, getDeployedContract, readConfig, readIntegrationInfo } from '../../src';

// OpenWeather historical API allows free access only to the last 5 days
// Use timestamp for 24 hours ago, excluding milliseconds
const dt = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);

// Default coordinates are for London, England
const getEncodedParameters = () =>
  encode([
    { name: 'lat', type: 'string', value: '51.507222' },
    { name: 'lon', type: 'string', value: '-0.1275' },
    { name: 'dt', type: 'string', value: dt.toString() },
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

  const r1 = await requester.sunsetData(requestId);
  // Multiply by 1000 to go from seconds to milliseconds
  const sunsetDate = new Date(r1 * 1000).toUTCString();
  cliPrint.info(`Timestamp of sunset: ${r1} (${sunsetDate})`);

  // Temp is first divided by 1e2, because the response value is multiplied with 1e2 by Airnode
  // Temp is then converted from Kelvin to Celsius
  const r2 = await requester.tempData(requestId);
  cliPrint.info(`Temperature: ${r2 / 1e2 - 273.15} C`);

  const r3 = await requester.weatherData(requestId);
  cliPrint.info(`Weather: ${r3}`);

  const r4 = await requester.timestampData(requestId);
  const transactionDate = new Date(r4 * 1000).toUTCString();
  cliPrint.info(`Timestamp of encoded transaction: ${r4} (${transactionDate})`);
};
