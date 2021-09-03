import * as ethers from 'ethers';
import { AirnodeRrpFactory } from '@api3/protocol';
import { findProviderUrls, findAirnodeRrpAddresses } from './config';
import { ChainType, Configurations } from '../types';
import * as logger from '../utils/logger';

const chainIdsToNames: Record<string, string> = {
  1: 'mainnet',
  3: 'ropsten',
  4: 'rinkeby',
  5: 'göerli',
  42: 'kovan',
  100: 'xdai',
};

export async function checkAirnodeXpub(
  configs: Configurations,
  secrets: Record<string, string>,
  airnodeAddress: string
) {
  logger.debug('Checking Airnode xpub');
  const providerUrls = findProviderUrls(configs, secrets);
  const airnodeRrpAddresses = findAirnodeRrpAddresses(configs);

  let spinner;
  let chainType: ChainType;
  for (chainType in providerUrls) {
    const chain = providerUrls[chainType];
    for (const chainId in chain) {
      const chainName = chainIdsToNames[chainId] || chainId;
      spinner = logger.spinner(`Checking Airnode xpub on chain: ${chainName} (${chainType})`);
      let checkSuccesful = false;
      for (const providerUrl of chain[chainId]) {
        try {
          const provider = new ethers.providers.JsonRpcProvider(providerUrl);
          const airnodeRrp = AirnodeRrpFactory.connect(airnodeRrpAddresses[chainType]![chainId], provider);
          const airnodeXpub = await airnodeRrp.airnodeToXpub(airnodeAddress);
          if (airnodeXpub === '') {
            spinner.warn(`Airnode airnodeXpub not found on chain: ${chainName} (${chainType})`);
            await checkMasterWalletBalance(provider, airnodeAddress, chainName);
          } else {
            // Assuming xpub is valid
            spinner.succeed(`Airnode xpub found on chain: ${chainName} (${chainType})`);
          }
          checkSuccesful = true;
          break;
        } catch (err) {
          // Continue
          spinner.warn(`Couldn't connect via ${providerUrl} provider`);
          logger.debug(err.toString());
        }
      }
      if (!checkSuccesful) {
        spinner.info(`Skipped checking Airnode xpub on chain: ${chainName} (${chainType})`);
      }
    }
  }
}

async function checkMasterWalletBalance(
  provider: ethers.providers.Provider,
  airnodeAddress: string,
  chainName: string
) {
  const spinner = logger.spinner(`Checking airnode address balance on chain: ${chainName}`);
  try {
    const balance = await provider.getBalance(airnodeAddress);
    // Overestimate the required ETH
    const txCost = (await provider.getGasPrice()).mul(500_000);
    spinner.info(`Balance of ${airnodeAddress} is ${ethers.utils.formatEther(balance)} ETH on chain: ${chainName}`);
    if (txCost.gt(balance)) {
      logger.warn(
        `Fund it with at least ${ethers.utils.formatEther(txCost)} ETH for it to be able to set your Airnode parameters`
      );
    } else {
      logger.succeed('Airnode address balance is enough to set your Airnode parameters');
    }
  } catch (err) {
    spinner.info(`Skipped checking airnode address balance on chain: ${chainName}`);
    logger.debug(err.toString());
  }
}
