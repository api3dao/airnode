import * as ethers from 'ethers';
import { abi } from './Airnode.json';

// mainnet, ropsten, rinkeby, kovan, göerli
const validChainIds = [1, 3, 4, 5, 42];

export async function checkProviderRecords(providerId, chains, masterWalletAddress) {
  for (const chain of chains) {
    if (validChainIds.includes(chain.id)) {
      const provider = ethers.getDefaultProvider(chain.id);
      const airnode = new ethers.Contract(chain.contracts.Airnode, abi, provider);
      const providerRecord = await airnode.getProvider(providerId);
      if (providerRecord.xpub === '') {
        console.log(`Provider record not found on chain with ID ${chain.id}`);
        const balance = await provider.getBalance(masterWalletAddress);
        // Overestimate the required ETH
        const txCost = (await provider.getGasPrice()).mul(500_000);
        if (txCost.gt(balance)) {
          console.log(`Balance of ${masterWalletAddress} is ${ethers.utils.formatEther(balance)} ETH`);
          console.log(`Fund it with at least ${ethers.utils.formatEther(txCost)} ETH`);
        }
      }
    } else {
      console.log(`Skipping chain with ID ${chain.id} for provider record check`);
    }
  }
}
