import * as ethers from 'ethers';
import ora from 'ora';
import { AirnodeABI } from '@airnode/protocol';

const chainIdsToNames = {
  1: 'mainnet',
  3: 'ropsten',
  4: 'rinkeby',
  5: 'kovan',
  42: 'göerli',
  100: 'xdai',
};

export async function checkProviderRecords(providerId, chains, masterWalletAddress) {
  let spinner;
  for (const chain of chains) {
    const chainName = chainIdsToNames[chain.id] || `${chain.id}`;
    spinner = ora(`Checking provider record on chain: ${chainName}`).start();
    try {
      // Use the first provider of the chain in config.json
      const provider = new ethers.providers.JsonRpcProvider(chain.providers[0].url);
      // chain.contracts.Airnode is a required field
      const airnode = new ethers.Contract(chain.contracts.Airnode, AirnodeABI, provider);
      const providerRecord = await airnode.getProvider(providerId);
      if (providerRecord.xpub === '') {
        spinner.warn(`Provider record not found on chain: ${chainName}`);
        await checkMasterWalletBalance(provider, masterWalletAddress, chainName);
      } else {
        // Assuming xpub is valid
        spinner.succeed(`Provider record found on chain: ${chainName}`);
      }
    } catch {
      // The provider for the network probably was not available
      // We can also cycle through chain.providers.* here
      spinner.info(`Skipped checking provider record on chain: ${chainName}`);
    }
  }
}

async function checkMasterWalletBalance(provider, masterWalletAddress, chainName) {
  const spinner = ora(`Checking master wallet balance on chain: ${chainName}`).start();
  try {
    const balance = await provider.getBalance(masterWalletAddress);
    // Overestimate the required ETH
    const txCost = (await provider.getGasPrice()).mul(500_000);
    spinner.info(
      `Balance of ${masterWalletAddress} is ${ethers.utils.formatEther(balance)} ETH on chain: ${chainName}`
    );
    if (txCost.gt(balance)) {
      ora().warn(
        `Fund it with at least ${ethers.utils.formatEther(txCost)} ETH for it to be able to create your provider record`
      );
    } else {
      ora().succeed('Master wallet balance is enough to create your provider record');
    }
  } catch {
    spinner.info(`Skipped checking master wallet balance on chain: ${chainName}`);
  }
}
