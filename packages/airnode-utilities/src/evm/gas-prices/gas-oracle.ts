import { ethers } from 'ethers';
import { go } from '@api3/promise-utils';
import { multiplyGasPrice, parsePriorityFee } from './gas-prices';
import {
  LatestBlockPercentileGasPriceStrategy,
  ProviderRecommendedGasPriceStrategy,
  ConstantGasPriceStrategy,
  GasPriceOracleStrategy,
  GasPriceOracleConfig,
} from './types';
import { GAS_ORACLE_STRATEGY_MAX_TIMEOUT_MS, RANDOM_BACKOFF_MIN_MS, RANDOM_BACKOFF_MAX_MS } from '../../constants';
import { logger, PendingLog, LogsData } from '../../logging';

export const calculateTimeout = (startTime: number, totalTimeout: number) => totalTimeout - (Date.now() - startTime);

export const getPercentile = (percentile: number, array: ethers.BigNumber[]) => {
  if (!array.length) return;
  array.sort((a, b) => (a.gt(b) ? 1 : -1));

  const index = Math.ceil(array.length * (percentile / 100)) - 1;
  return array[index];
};

// Check whether a value's change exceeds the maxDeviationMultipiler limit
// and returns false if it does and true otherwise.
export const checkMaxDeviationLimit = (
  value: ethers.BigNumber,
  referenceValue: ethers.BigNumber,
  maxDeviationMultiplier: number
) => {
  // Handle maximum two decimals for maxDeviationMultiplier
  const maxDeviationMultiplierBN = ethers.BigNumber.from(Math.round(maxDeviationMultiplier * 100));

  return (
    // Check that the current value is not higher than the maxDeviationMultiplier allows
    referenceValue.gt(value.mul(ethers.BigNumber.from(100)).div(maxDeviationMultiplierBN)) &&
    // Check that the current value is not lower than the maxDeviationMultiplier allows
    referenceValue.lt(value.mul(maxDeviationMultiplierBN).div(ethers.BigNumber.from(100)))
  );
};

// Returns the constant gas price
export const fetchConstantGasPrice = (constantGasPriceStrategy: ConstantGasPriceStrategy) =>
  parsePriorityFee(constantGasPriceStrategy.gasPrice);

// Returns the provider gas price and applies the recommended multiplier
export const fetchProviderRecommendedGasPrice = async (
  provider: ethers.providers.StaticJsonRpcProvider,
  gasOracleOptions: ProviderRecommendedGasPriceStrategy
) => {
  const { recommendedGasPriceMultiplier } = gasOracleOptions;

  const gasPrice = await go(() => provider.getGasPrice(), {
    attemptTimeoutMs: GAS_ORACLE_STRATEGY_MAX_TIMEOUT_MS,
    totalTimeoutMs: calculateTimeout(Date.now(), GAS_ORACLE_STRATEGY_MAX_TIMEOUT_MS),
    retries: 2,
    delay: { type: 'random' as const, minDelayMs: RANDOM_BACKOFF_MIN_MS, maxDelayMs: RANDOM_BACKOFF_MAX_MS },
    onAttemptError: (goError) => logger.warn(`Failed attempt to get gas price. Error: ${goError.error}.`),
  });

  if (!gasPrice.success) {
    throw new Error(`Unable to get provider recommended gas price.`);
  }

  const multipliedGasPrice = recommendedGasPriceMultiplier
    ? multiplyGasPrice(gasPrice.data, recommendedGasPriceMultiplier)
    : gasPrice.data;

  return multipliedGasPrice;
};

export const fetchLatestBlockPercentileGasPrice = async (
  provider: ethers.providers.StaticJsonRpcProvider,
  gasOracleOptions: LatestBlockPercentileGasPriceStrategy
) => {
  const { percentile, minTransactionCount, maxDeviationMultiplier, pastToCompareInBlocks } = gasOracleOptions;

  // Define block tags to fetch
  const blockTagsToFetch = ['latest', -pastToCompareInBlocks];

  // Fetch blocks in parallel
  const blockPromises = blockTagsToFetch.map(
    async (blockTag) =>
      await go(() => provider.getBlockWithTransactions(blockTag), {
        attemptTimeoutMs: GAS_ORACLE_STRATEGY_MAX_TIMEOUT_MS,
        totalTimeoutMs: calculateTimeout(Date.now(), GAS_ORACLE_STRATEGY_MAX_TIMEOUT_MS),
        retries: 2,
        delay: { type: 'random' as const, minDelayMs: RANDOM_BACKOFF_MIN_MS, maxDelayMs: RANDOM_BACKOFF_MAX_MS },
        onAttemptError: (goError) => logger.warn(`Failed attempt to get block. Error: ${goError.error}.`),
      })
  );

  // Reject as soon as possible if fetching a block fails for speed
  const resolvedGoBlocks = await Promise.all(blockPromises);

  // Calculate gas price percentiles for each block
  const blockPercentileGasPrices = resolvedGoBlocks.reduce(
    (acc: { blockNumber: number; percentileGasPrice: ethers.BigNumber }[], block) => {
      // Stop processing if fetching the block was not succesful, there is no block data,
      // or if the block does not have enough transactions
      if (!block.success || !block?.data?.transactions || block.data.transactions.length < minTransactionCount)
        return acc;

      // Filter for transactions with gas prices
      const transactionsWithGasPrices = block.data.transactions.reduce((acc: ethers.BigNumber[], tx) => {
        if (tx.gasPrice) return [...acc, tx.gasPrice];
        if (block.data.baseFeePerGas && tx.maxPriorityFeePerGas)
          return [...acc, block.data.baseFeePerGas.add(tx.maxPriorityFeePerGas)];

        return acc;
      }, []);

      // Stop processing if there are not enough transactions with gas prices
      if (transactionsWithGasPrices.length < minTransactionCount) return acc;

      const percentileGasPrice = getPercentile(percentile, transactionsWithGasPrices);

      // Note: percentileGasPrice should never be undefined as only arrays with items
      // should have been passed in at this point
      if (!percentileGasPrice) return acc;

      return [...acc, { percentileGasPrice, blockNumber: block.data.number }];
    },
    []
  );

  // Check percentileGasPrices only if we have the transactions from two blocks
  if (blockPercentileGasPrices.length === 2) {
    // Sort by blockNumber
    const sortedBlockPercentileGasPrices = blockPercentileGasPrices.sort((a, b) => b.blockNumber - a.blockNumber);
    const [latestPercentileGasPrice, referencePercentileGasPrice] = sortedBlockPercentileGasPrices;

    // Check that the latest block percentileGasPrice does not exceed the maxDeviationMultiplier compared to
    // the reference block to protect against gas price spikes
    const isWithinDeviationLimit = checkMaxDeviationLimit(
      latestPercentileGasPrice.percentileGasPrice,
      referencePercentileGasPrice.percentileGasPrice,
      maxDeviationMultiplier
    );

    // Return the percentile for the latest block if within the limit
    if (isWithinDeviationLimit) {
      return latestPercentileGasPrice.percentileGasPrice;
    }

    throw new Error(
      `Latest block percentileGasPrice exceeds the max deviation multiplier limit set to (${maxDeviationMultiplier}%).`
    );
  } else {
    throw new Error(`Unable to get enough blocks or transactions to calculate percentileGasPrice.`);
  }
};

export const attemptGasOracleStrategy = async (
  provider: ethers.providers.StaticJsonRpcProvider,
  gasOracleConfig: GasPriceOracleStrategy
) => {
  switch (gasOracleConfig.gasPriceStrategy) {
    case 'latestBlockPercentileGasPrice':
      return await fetchLatestBlockPercentileGasPrice(provider, gasOracleConfig);
    case 'providerRecommendedGasPrice':
      return await fetchProviderRecommendedGasPrice(provider, gasOracleConfig);
    case 'constantGasPrice':
      return fetchConstantGasPrice(gasOracleConfig);
  }
};

// Get gas price based on gas price oracle strategies
export const getGasPrice = async (
  provider: ethers.providers.StaticJsonRpcProvider,
  gasPriceOracleConfig: GasPriceOracleConfig
): Promise<LogsData<ethers.BigNumber>> => {
  const logs: PendingLog[] = [];

  // Attempt gas oracle strategies in order
  for (const strategy of gasPriceOracleConfig) {
    const goAttemptGasOraclePriceStrategy = await go(() => attemptGasOracleStrategy(provider, strategy), {
      retries: 0,
    });

    // Continue to the next strategy attempt if the current fails
    if (!goAttemptGasOraclePriceStrategy.success) {
      logs.push(
        logger.pend(
          'ERROR',
          `Strategy (${strategy.gasPriceStrategy}) failed to return a gas price. Error: ${goAttemptGasOraclePriceStrategy.error.message}.`
        )
      );
      continue;
    }

    // Otherwise return the gas price
    logs.push(
      logger.pend(
        'INFO',
        `Strategy (${strategy.gasPriceStrategy}) gas price set to ${ethers.utils.formatUnits(
          goAttemptGasOraclePriceStrategy.data,
          'gwei'
        )} gwei.`
      )
    );
    return [logs, goAttemptGasOraclePriceStrategy.data];
  }

  // Return the constant strategy gas price if all other strategies fail
  const constantGasPriceConfig = gasPriceOracleConfig.find(
    (strategy) => strategy.gasPriceStrategy === 'constantGasPrice'
  ) as ConstantGasPriceStrategy;
  const constantGasPrice = fetchConstantGasPrice(constantGasPriceConfig);
  logs.push(
    logger.pend(
      'INFO',
      `All oracle strategies failed to return a gas price, returning constant gas price set to ${ethers.utils.formatUnits(
        constantGasPrice,
        'gwei'
      )} gwei.`
    )
  );

  return [logs, constantGasPrice];
};
