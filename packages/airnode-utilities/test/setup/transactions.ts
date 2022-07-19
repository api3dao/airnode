import * as hre from 'hardhat';
import { BigNumber } from 'ethers';
import '@nomiclabs/hardhat-ethers';

const providerUrl = 'http://127.0.0.1:8545/';
const provider = new hre.ethers.providers.JsonRpcProvider(providerUrl);

// Number of transactions to execute per wallet. This will also be the number of blocks mined.
// By default we will be fetching the latest block and (latest block - 20) so we need to mine
// a minimum of 21 blocks with transactions.
const transactionCount = 21;

export const executeTransactions = async (txType: 'legacy' | 'eip1559') => {
  // Get Hardhat accounts to use for transactions
  const wallets = await hre.ethers.getSigners();
  // Number of wallets to use with each executing a transaction per block
  wallets.splice(20);

  const blocksWithGasPrices = [];

  // Send transactions sequentially to keep nonces in order
  for (let i = 0; i < transactionCount; i++) {
    const gasPrices: BigNumber[] = [];

    // Send transactions in parallel for wallets
    const walletPromises = wallets.map(async (wallet) => {
      const gasTarget =
        txType === 'eip1559'
          ? {
              // Set maxPriorityFeePerGas to a random number between 1-10
              maxPriorityFeePerGas: hre.ethers.utils.parseUnits(Math.floor(Math.random() * 10 + 1).toString(), 'gwei'),
              // Set maxFeePerGas to a random number between 1-100 + 11 to ensure that it is larger than maxPriorityFeePerGas
              maxFeePerGas: hre.ethers.utils.parseUnits((Math.floor(Math.random() * 100 + 1) + 11).toString(), 'gwei'),
            }
          : {
              // Set gasPrice randomly between 1-100
              gasPrice: hre.ethers.utils.parseUnits(Math.floor(Math.random() * 100 + 1).toString(), 'gwei'),
            };

      if (txType === 'eip1559') {
        gasPrices.push(gasTarget.maxPriorityFeePerGas!);
      } else {
        gasPrices.push(gasTarget.gasPrice!);
      }

      await wallet.sendTransaction({
        to: wallets[0].address,
        value: hre.ethers.utils.parseEther('0.001'),
        ...gasTarget,
        nonce: i,
      });
    });
    await Promise.allSettled(walletPromises);

    // Mine block for current loop iteration
    await hre.network.provider.send('hardhat_mine');

    if (txType === 'eip1559') {
      const { baseFeePerGas } = await provider.getBlockWithTransactions('latest');
      blocksWithGasPrices.push({
        blockNumber: i + 1,
        gasPrices: gasPrices.map((p) => p.add(baseFeePerGas!)),
      });
    } else {
      blocksWithGasPrices.push({
        blockNumber: i + 1,
        gasPrices: gasPrices,
      });
    }
  }

  return { blocksWithGasPrices };
};
