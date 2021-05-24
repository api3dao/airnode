import * as ethers from 'ethers';
import _ from 'lodash';
import ora from 'ora';
import { AirnodeRrpFactory } from '@api3/protocol';
import { findProviderUrls, findAirnodeRrpAddresses } from './config';
import { ChainType, Configurations } from '../types';

const chainIdsToNames: Record<string, string> = {
  1: 'mainnet',
  3: 'ropsten',
  4: 'rinkeby',
  5: 'göerli',
  42: 'kovan',
  100: 'xdai',
};

export async function checkAirnodeParameters(
  configs: Configurations,
  secrets: Record<string, string>,
  airnodeId: string,
  masterWalletAddress: string
) {
  const providerUrls = findProviderUrls(configs, secrets);
  const airnodeRrpAddresses = findAirnodeRrpAddresses(configs);

  let spinner;
  let chainType: ChainType;
  for (chainType in providerUrls) {
    const chain = providerUrls[chainType];
    for (const chainId in chain) {
      const chainName = chainIdsToNames[chainId] || chainId;
      spinner = ora(`Checking Airnode parameters on chain: ${chainName} (${chainType})`).start();
      let checkSuccesful = false;
      for (const providerUrl of chain[chainId]) {
        try {
          const provider = new ethers.providers.JsonRpcProvider(providerUrl);
          const airnodeRrp = AirnodeRrpFactory.connect(airnodeRrpAddresses[chainType]![chainId], provider);
          const airnodeParameters = await airnodeRrp.getAirnodeParameters(airnodeId);
          if (airnodeParameters.xpub === '') {
            spinner.warn(`Airnode parameters not found on chain: ${chainName} (${chainType})`);
            await checkMasterWalletBalance(provider, masterWalletAddress, chainName);
          } else {
            // Assuming xpub is valid
            spinner.succeed(`Airnode parameters found on chain: ${chainName} (${chainType})`);
          }
          checkSuccesful = true;
          break;
        } catch {
          // continue
          spinner.warn(`Couldn't connect via ${providerUrl} provider`);
        }
      }
      if (!checkSuccesful) {
        spinner.info(`Skipped checking Airnode parameters on chain: ${chainName} (${chainType})`);
      }
    }
  }
}

async function checkMasterWalletBalance(
  provider: ethers.providers.Provider,
  masterWalletAddress: string,
  chainName: string
) {
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
        `Fund it with at least ${ethers.utils.formatEther(txCost)} ETH for it to be able to set your Airnode parameters`
      );
    } else {
      ora().succeed('Master wallet balance is enough to set your Airnode parameters');
    }
  } catch {
    spinner.info(`Skipped checking master wallet balance on chain: ${chainName}`);
  }
}
