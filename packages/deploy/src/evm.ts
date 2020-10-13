import * as ethers from 'ethers';

export function deriveProviderId(mnemonic) {
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(['address'], [deriveMasterWalletAddress(mnemonic)])
  );
}

export function deriveMasterWalletAddress(mnemonic) {
  const masterWallet = ethers.utils.HDNode.fromMnemonic(mnemonic);
  return masterWallet.address;
}

export function generateMnemonic() {
  const masterWallet = ethers.Wallet.createRandom();
  return masterWallet.mnemonic.phrase;
}

export async function checkProviderRecords(providerId, chains, masterWalletAddress) {
  // mainnet, ropsten, rinkeby, kovan, göerli
  const validChainIds = [1, 3, 4, 5, 42];
  for (const chain of chains) {
    if (validChainIds.includes(chain.id)) {
      const provider = ethers.getDefaultProvider(chain.id);
      const abi = [
        {
          inputs: [
            {
              internalType: 'bytes32',
              name: 'providerId',
              type: 'bytes32',
            },
          ],
          name: 'getProvider',
          outputs: [
            {
              internalType: 'address',
              name: 'admin',
              type: 'address',
            },
            {
              internalType: 'string',
              name: 'xpub',
              type: 'string',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
      ];
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
