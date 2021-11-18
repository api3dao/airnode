import { ethers } from 'ethers';
import { deriveAirnodeXpub, deriveSponsorWalletAddress, getAirnodeRrp, sponsorRequester } from '@api3/airnode-admin';
import range from 'lodash/range';
import {
  getDeployedContract,
  getProvider,
  readIntegrationInfo,
  runAndHandleErrors,
  getAirnodeWallet,
  readConfig,
  cliPrint,
} from '../src';

const fulfilled = async (requestId: string) => {
  const airnodeRrp = await getDeployedContract('@api3/airnode-protocol/contracts/rrp/AirnodeRrp.sol');
  const provider = getProvider();
  return new Promise((resolve) => provider.once(airnodeRrp.filters.FulfilledRequest(null, requestId), resolve));
};

export const makeRequests = async (): Promise<string[]> => {
  const integrationInfo = readIntegrationInfo();
  const requester = await getDeployedContract(`contracts/${integrationInfo.integration}/Requester.sol`);
  const airnodeRrp = await getDeployedContract('@api3/airnode-protocol/contracts/rrp/AirnodeRrp.sol');
  const airnodeWallet = getAirnodeWallet();
  const provider = getProvider();
  const masterSponsor = ethers.Wallet.fromMnemonic(integrationInfo.mnemonic).connect(provider);

  const REQUEST_COUNT = 20;
  const USE_SAME_SPONSOR = true;

  const sponsors = range(REQUEST_COUNT).map(() => (USE_SAME_SPONSOR ? masterSponsor : ethers.Wallet.createRandom()));
  const ids: string[] = [];
  for (const sponsor of sponsors) {
    // NOTE: The request is always made to the first endpoint listed in the "triggers.rrp" inside config.json
    const endpointId = readConfig().triggers.rrp[0].endpointId;
    // NOTE: When doing this manually, you can use the 'derive-sponsor-wallet-address' from the admin CLI package
    const sponsorWalletAddress = await deriveSponsorWalletAddress(
      // NOTE: When doing this manually, you can use the 'derive-airnode-xpub' from the admin CLI package
      deriveAirnodeXpub(airnodeWallet.mnemonic.phrase),
      airnodeWallet.address,
      sponsor.address
    );

    // Fund the sponsor wallet
    const tx1 = await masterSponsor.sendTransaction({
      to: sponsorWalletAddress,
      value: ethers.utils.parseEther('0.1'),
    });
    await tx1.wait();

    // Fund the sponsor
    const tx2 = await masterSponsor.sendTransaction({ to: sponsor.address, value: ethers.utils.parseEther('0.1') });
    await tx2.wait();

    // Sponsor the requester
    await sponsorRequester(
      await getAirnodeRrp(readIntegrationInfo().providerUrl, {
        airnodeRrpAddress: airnodeRrp.address,
        signer: { mnemonic: sponsor.mnemonic.phrase },
      }),
      requester.address
    );

    // Import the function to get encoded parameters for the Airnode. See the respective "request-utils.ts" for details.
    const { getEncodedParameters } = await import(`../integrations/${integrationInfo.integration}/request-utils.ts`);

    // Trigger the Airnode request
    console.log(`Making a request to sponsor wallet: `, sponsorWalletAddress);
    const receipt = await requester.makeRequest(
      airnodeWallet.address,
      endpointId,
      sponsor.address,
      sponsorWalletAddress,
      await getEncodedParameters()
    );

    // Wait until the transaction is mined
    ids.push(
      await new Promise<string>((resolve) =>
        getProvider().once(receipt.hash, (tx) => {
          const parsedLog = airnodeRrp.interface.parseLog(tx.logs[0]);
          resolve(parsedLog.args.requestId);
        })
      )
    );
  }

  return ids;
};

const main = async () => {
  cliPrint.info('Making requests...');
  const requestIds = await makeRequests();
  cliPrint.info('Waiting for fulfillments...');

  const promises = requestIds.map(async (requestId) => {
    await fulfilled(requestId);
    cliPrint.info('Requests fulfilled');

    const integrationInfo = readIntegrationInfo();
    // Import the function to print the response from the chosen integration. See the respective "request-utils.ts" for
    // details.
    const { printResponse } = await import(`../integrations/${integrationInfo.integration}/request-utils.ts`);
    await printResponse(requestId);
  });

  await Promise.all(promises);
};

runAndHandleErrors(main);
