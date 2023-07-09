import { ethers } from 'ethers';
import { go } from '@api3/promise-utils';
import { config } from '@api3/airnode-validator';
import { GasTarget, LegacyGasTarget, Eip1559GasTarget, Provider } from './types';
import {
  GAS_ORACLE_STRATEGY_MAX_TIMEOUT_MS,
  GAS_ORACLE_STRATEGY_ATTEMPT_TIMEOUT_MS,
  GAS_ORACLE_RANDOM_BACKOFF_MIN_MS,
  GAS_ORACLE_RANDOM_BACKOFF_MAX_MS,
} from '../../constants';
import { logger, PendingLog, LogsData } from '../../logging';

export const calculateTimeout = (startTime: number, totalTimeout: number) => totalTimeout - (Date.now() - startTime);

export const parsePriorityFee = ({ value, unit }: config.Amount) => ethers.utils.parseUnits(value.toString(), unit);

export const multiplyGasPrice = (gasPrice: ethers.BigNumber, gasPriceMultiplier: number) =>
  gasPrice.mul(ethers.BigNumber.from(Math.round(gasPriceMultiplier * 100))).div(ethers.BigNumber.from(100));

// This will return the gasLimit with the gasTarget if getGasPrice is called from a place where the fulfillmentGasLimit
// is available in the config.json and otherwise no gasLimit will be returned for use with other transactions
// (e.g. withdrawal transactions and airnode-admin CLI/SDK)
export const getGasLimit = (fulfillmentGasLimit?: number) => {
  return fulfillmentGasLimit ? { gasLimit: ethers.BigNumber.from(fulfillmentGasLimit) } : {};
};

// Returns the gasTarget with gasLimit from fulfillmentGasLimit added
export const getGasTargetWithGasLimit = (gasTarget: GasTarget, fulfillmentGasLimit?: number) => ({
  ...gasTarget,
  ...getGasLimit(fulfillmentGasLimit),
});

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
export const fetchConstantGasPrice = (constantGasPriceStrategy: config.ConstantGasPriceStrategy): LegacyGasTarget => ({
  type: 0,
  gasPrice: parsePriorityFee(constantGasPriceStrategy.gasPrice),
});

// Returns the provider gas price and applies the recommended multiplier
export const fetchProviderRecommendedGasPrice = async (
  provider: Provider,
  gasOracleOptions: config.ProviderRecommendedGasPriceStrategy,
  startTime: number
): Promise<LegacyGasTarget> => {
  const { recommendedGasPriceMultiplier } = gasOracleOptions;

  const goGasPrice = await go(() => provider.getGasPrice(), {
    attemptTimeoutMs: GAS_ORACLE_STRATEGY_ATTEMPT_TIMEOUT_MS,
    totalTimeoutMs: calculateTimeout(startTime, GAS_ORACLE_STRATEGY_MAX_TIMEOUT_MS),
    retries: 1,
    delay: {
      type: 'random',
      minDelayMs: GAS_ORACLE_RANDOM_BACKOFF_MIN_MS,
      maxDelayMs: GAS_ORACLE_RANDOM_BACKOFF_MAX_MS,
    },
    onAttemptError: (goError) => logger.warn(`Failed attempt to get gas price. Error: ${goError.error}.`),
  });

  if (!goGasPrice.success) {
    throw new Error(`Unable to get provider recommended gas price.`);
  }

  const multipliedGasPrice = recommendedGasPriceMultiplier
    ? multiplyGasPrice(goGasPrice.data, recommendedGasPriceMultiplier)
    : goGasPrice.data;

  return {
    type: 0,
    gasPrice: multipliedGasPrice,
  };
};

export const fetchSanitizedProviderRecommendedGasPrice = async (
  provider: Provider,
  gasOracleOptions: config.SanitizedProviderRecommendedGasPriceStrategy,
  startTime: number
): Promise<LegacyGasTarget> => {
  const goBlockHeader = await go(() => provider.getBlock('latest'), {
    attemptTimeoutMs: GAS_ORACLE_STRATEGY_ATTEMPT_TIMEOUT_MS,
    totalTimeoutMs: calculateTimeout(startTime, GAS_ORACLE_STRATEGY_MAX_TIMEOUT_MS),
    retries: 1,
    delay: {
      type: 'random',
      minDelayMs: GAS_ORACLE_RANDOM_BACKOFF_MIN_MS,
      maxDelayMs: GAS_ORACLE_RANDOM_BACKOFF_MAX_MS,
    },
    onAttemptError: (goError) => logger.warn(`Failed attempt to get block. Error: ${goError.error}.`),
  });
  if (!goBlockHeader.success || !goBlockHeader.data?.baseFeePerGas) {
    throw new Error(`Unable to get provider recommended EIP1559 gas price.`);
  }
  const { baseFeePerGas } = goBlockHeader.data;

  const { recommendedGasPriceMultiplier, baseFeeMultiplier, baseFeeMultiplierThreshold, priorityFee } =
    gasOracleOptions;

  const gasTarget = await fetchProviderRecommendedGasPrice(
    provider,
    {
      gasPriceStrategy: 'providerRecommendedGasPrice',
      recommendedGasPriceMultiplier: recommendedGasPriceMultiplier,
    },
    startTime
  );
  const multipliedGasPrice = gasTarget.gasPrice;

  const maxPriorityFeePerGas = parsePriorityFee(priorityFee);

  if (multipliedGasPrice.gt(baseFeePerGas.mul(baseFeeMultiplierThreshold))) {
    return {
      type: 0,
      gasPrice: baseFeePerGas.mul(baseFeeMultiplier).add(maxPriorityFeePerGas),
    };
  }

  return {
    type: 0,
    gasPrice: multipliedGasPrice,
  };
};

export const fetchProviderRecommendedEip1559GasPrice = async (
  provider: Provider,
  gasOracleOptions: config.ProviderRecommendedEip1559GasPriceStrategy,
  startTime: number
): Promise<Eip1559GasTarget> => {
  const goBlockHeader = await go(() => provider.getBlock('latest'), {
    attemptTimeoutMs: GAS_ORACLE_STRATEGY_ATTEMPT_TIMEOUT_MS,
    totalTimeoutMs: calculateTimeout(startTime, GAS_ORACLE_STRATEGY_MAX_TIMEOUT_MS),
    retries: 1,
    delay: {
      type: 'random',
      minDelayMs: GAS_ORACLE_RANDOM_BACKOFF_MIN_MS,
      maxDelayMs: GAS_ORACLE_RANDOM_BACKOFF_MAX_MS,
    },
    onAttemptError: (goError) => logger.warn(`Failed attempt to get block. Error: ${goError.error}.`),
  });
  if (!goBlockHeader.success || !goBlockHeader.data?.baseFeePerGas) {
    throw new Error(`Unable to get provider recommended EIP1559 gas price.`);
  }

  const { priorityFee, baseFeeMultiplier } = gasOracleOptions;

  const maxPriorityFeePerGas = parsePriorityFee(priorityFee);
  const maxFeePerGas = goBlockHeader.data
    .baseFeePerGas!.mul(ethers.BigNumber.from(baseFeeMultiplier))
    .add(maxPriorityFeePerGas!);

  return {
    type: 2,
    maxPriorityFeePerGas,
    maxFeePerGas,
  };
};

export const fetchLatestBlockPercentileGasPrice = async (
  provider: Provider,
  gasOracleOptions: config.LatestBlockPercentileGasPriceStrategy,
  startTime: number
): Promise<LegacyGasTarget> => {
  const { percentile, minTransactionCount, maxDeviationMultiplier, pastToCompareInBlocks } = gasOracleOptions;

  // Define block tags to fetch
  const blockTagsToFetch = ['latest', -pastToCompareInBlocks];

  // Fetch blocks in parallel
  const blockPromises = blockTagsToFetch.map((blockTag) =>
    go(() => provider.getBlockWithTransactions(blockTag), {
      attemptTimeoutMs: GAS_ORACLE_STRATEGY_ATTEMPT_TIMEOUT_MS,
      totalTimeoutMs: calculateTimeout(startTime, GAS_ORACLE_STRATEGY_MAX_TIMEOUT_MS),
      retries: 1,
      delay: {
        type: 'random',
        minDelayMs: GAS_ORACLE_RANDOM_BACKOFF_MIN_MS,
        maxDelayMs: GAS_ORACLE_RANDOM_BACKOFF_MAX_MS,
      },
      onAttemptError: (goError) => logger.warn(`Failed attempt to get block. Error: ${goError.error}.`),
    })
  );

  // Reject as soon as possible if fetching a block fails for speed
  const resolvedGoBlocks = await Promise.all(blockPromises);

  // Calculate gas price percentiles for each block
  const blockPercentileGasPrices = resolvedGoBlocks.reduce(
    (acc: { blockNumber: number; percentileGasPrice: ethers.BigNumber }[], block) => {
      // Stop processing if fetching the block was not successful, there is no block data,
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
      return { type: 0, gasPrice: latestPercentileGasPrice.percentileGasPrice };
    }

    throw new Error(
      `Latest block percentileGasPrice exceeds the max deviation multiplier limit set to (${maxDeviationMultiplier}%).`
    );
  } else {
    throw new Error(`Unable to get enough blocks or transactions to calculate percentileGasPrice.`);
  }
};

export const attemptGasOracleStrategy = (
  provider: Provider,
  gasOracleConfig: config.GasPriceOracleStrategy,
  startTime: number
): Promise<GasTarget> => {
  switch (gasOracleConfig.gasPriceStrategy) {
    case 'latestBlockPercentileGasPrice':
      return fetchLatestBlockPercentileGasPrice(provider, gasOracleConfig, startTime);
    case 'providerRecommendedGasPrice':
      return fetchProviderRecommendedGasPrice(provider, gasOracleConfig, startTime);
    case 'sanitizedProviderRecommendedGasPrice':
      return fetchSanitizedProviderRecommendedGasPrice(provider, gasOracleConfig, startTime);
    case 'providerRecommendedEip1559GasPrice':
      return fetchProviderRecommendedEip1559GasPrice(provider, gasOracleConfig, startTime);
    default:
      throw new Error('Unsupported gas price oracle strategy.');
  }
};

// Get gas price based on gas price oracle strategies
export const getGasPrice = async (
  provider: Provider,
  chainOptions: config.ChainOptions
): Promise<LogsData<GasTarget>> => {
  const { gasPriceOracle, fulfillmentGasLimit } = chainOptions;

  const goProcessGasPriceOracleStrategies = await go(() => processGasPriceOracleStrategies(provider, gasPriceOracle), {
    totalTimeoutMs: GAS_ORACLE_STRATEGY_MAX_TIMEOUT_MS,
  });

  // Return the strategy gas price if successful
  if (goProcessGasPriceOracleStrategies.success && goProcessGasPriceOracleStrategies.data[1]) {
    const [logs, strategyGasTarget] = goProcessGasPriceOracleStrategies.data;
    return [logs, getGasTargetWithGasLimit(strategyGasTarget, fulfillmentGasLimit)];
  }

  // Return the constant strategy gas price if all other strategies fail
  const constantGasPriceConfig = gasPriceOracle.find(
    (strategy) => strategy.gasPriceStrategy === 'constantGasPrice'
  ) as config.ConstantGasPriceStrategy;
  const constantGasTarget = fetchConstantGasPrice(constantGasPriceConfig);

  const log = logger.pend(
    'INFO',
    `All oracle strategies failed to return a gas price, returning constant gas price set to ${ethers.utils.formatUnits(
      constantGasTarget.gasPrice,
      'gwei'
    )} gwei.`
  );
  const strategyLogs = goProcessGasPriceOracleStrategies.success ? goProcessGasPriceOracleStrategies.data[0] : [];

  return [[log, ...strategyLogs], getGasTargetWithGasLimit(constantGasTarget, fulfillmentGasLimit)];
};

export const processGasPriceOracleStrategies = async (
  provider: Provider,
  gasPriceOracleConfig: config.GasPriceOracleConfig
): Promise<LogsData<GasTarget | null>> => {
  const logs: PendingLog[] = [];
  const startTime = Date.now();

  const gasPriceOracleStrategies = gasPriceOracleConfig.filter(
    (strategy) => strategy.gasPriceStrategy !== 'constantGasPrice'
  );

  // Attempt gas oracle strategies (excluding constantGasPrice) in order
  for (const strategy of gasPriceOracleStrategies) {
    const goAttemptGasOraclePriceStrategy = await go(() => attemptGasOracleStrategy(provider, strategy, startTime));

    // Continue to the next strategy attempt if the current fails
    if (!goAttemptGasOraclePriceStrategy.success) {
      logs.push(
        logger.pend(
          'WARN',
          `Strategy (${strategy.gasPriceStrategy}) failed to return a gas price. Error: ${goAttemptGasOraclePriceStrategy.error.message}.`
        )
      );
      continue;
    }

    // Otherwise return the gas price
    const message =
      goAttemptGasOraclePriceStrategy.data.type === 2
        ? `Strategy (${strategy.gasPriceStrategy}) gas price set to a Max Fee of ${ethers.utils.formatUnits(
            goAttemptGasOraclePriceStrategy.data.maxFeePerGas,
            'gwei'
          )} gwei and a Priority Fee of ${ethers.utils.formatUnits(
            goAttemptGasOraclePriceStrategy.data.maxPriorityFeePerGas,
            'gwei'
          )} gwei`
        : `Strategy (${strategy.gasPriceStrategy}) gas price set to ${ethers.utils.formatUnits(
            goAttemptGasOraclePriceStrategy.data.gasPrice,
            'gwei'
          )} gwei.`;
    logs.push(logger.pend('INFO', message));

    return [logs, goAttemptGasOraclePriceStrategy.data];
  }

  // Return logs and null if all strategies fail
  return [logs, null];
};
