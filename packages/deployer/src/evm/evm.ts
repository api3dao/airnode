import * as ethers from 'ethers';
import ora from 'ora';
import { abi } from './Airnode.json';

const validChains = {
  1: 'mainnet',
  3: 'ropsten',
  4: 'rinkeby',
  5: 'kovan',
  42: 'göerli',
};

export async function checkProviderRecords(providerId, chains, masterWalletAddress) {
  let spinner;
  for (const chain of chains) {
    if (chain.id in validChains) {
      spinner = ora(`Checking provider record on network: ${validChains[chain.id]}`).start();
      const provider = ethers.getDefaultProvider(chain.id);
      const airnode = new ethers.Contract(chain.contracts.Airnode, abi, provider);
      const providerRecord = await airnode.getProvider(providerId);
      if (providerRecord.xpub === '') {
        spinner.warn(`Provider record not found on network: ${validChains[chain.id]}`);
        const balance = await provider.getBalance(masterWalletAddress);
        // Overestimate the required ETH
        const txCost = (await provider.getGasPrice()).mul(500_000);
        if (txCost.gt(balance)) {
          ora().info(
            `Balance of ${masterWalletAddress} is ${ethers.utils.formatEther(balance)} ETH on network: ${
              validChains[chain.id]
            }`
          );
          ora().warn(
            `Fund it with at least ${ethers.utils.formatEther(
              txCost
            )} ETH for it to be able to create your provider record`
          );
        }
      } else {
        spinner.succeed(`Provider record found on network: ${validChains[chain.id]}`);
      }
    } else {
      ora().info(`Skipping unknown network with chain ID: ${chain.id} for provider record check`);
    }
  }
}
