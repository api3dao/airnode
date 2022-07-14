import { ethers } from 'ethers';
import { go, assertGoError, assertGoSuccess } from '@api3/promise-utils';
import { config } from '@api3/airnode-validator';
import * as gasOracle from './gas-oracle';
import { GAS_ORACLE_STRATEGY_ATTEMPT_TIMEOUT_MS, GAS_ORACLE_STRATEGY_MAX_TIMEOUT_MS } from '../../constants';

// Jest version 27 has a bug where jest.setTimeout does not work correctly inside describe or test blocks
// https://github.com/facebook/jest/issues/11607
jest.setTimeout(20_000);

describe('Gas oracle', () => {
  const provider = new ethers.providers.StaticJsonRpcProvider('http://127.0.0.1:8545/');
  const latestBlockPercentileGasPriceStrategy: config.LatestBlockPercentileGasPriceStrategy = {
    gasPriceStrategy: 'latestBlockPercentileGasPrice',
    percentile: 60,
    minTransactionCount: 20,
    pastToCompareInBlocks: 20,
    maxDeviationMultiplier: 2,
  };
  const providerRecommendedGasPriceStrategy: config.ProviderRecommendedGasPriceStrategy = {
    gasPriceStrategy: 'providerRecommendedGasPrice',
    recommendedGasPriceMultiplier: 1.2,
  };
  const constantGasPriceStrategy: config.ConstantGasPriceStrategy = {
    gasPriceStrategy: 'constantGasPrice',
    gasPrice: {
      value: 10,
      unit: 'gwei',
    },
  };
  const defaultGasPriceOracleOptions: config.GasPriceOracleConfig = [
    latestBlockPercentileGasPriceStrategy,
    providerRecommendedGasPriceStrategy,
    constantGasPriceStrategy,
  ];

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('getPercentile', () => {
    const gasPriceArray = Array.from(Array(10), (_, i) => ethers.BigNumber.from((i + 1) * 10));

    it('calculates percentileGasPrice', () => {
      const percentileGasPrice = gasOracle.getPercentile(70, gasPriceArray);
      expect(percentileGasPrice).toEqual(ethers.BigNumber.from(70));
    });
  });

  describe('checkMaxDeviationLimit', () => {
    it('returns false if increase is exceeding maxDeviationMultiplier', () => {
      const isWithinDeviationLimit = gasOracle.checkMaxDeviationLimit(
        ethers.BigNumber.from(50),
        ethers.BigNumber.from(10),
        2
      );
      expect(isWithinDeviationLimit).toEqual(false);
    });

    it('returns false if decrease is exceeding maxDeviationMultiplier', () => {
      const isWithinDeviationLimit = gasOracle.checkMaxDeviationLimit(
        ethers.BigNumber.from(10),
        ethers.BigNumber.from(50),
        2
      );
      expect(isWithinDeviationLimit).toEqual(false);
    });

    it('returns true if increase is within the maxDeviationMultiplier limit', () => {
      const isWithinDeviationLimit = gasOracle.checkMaxDeviationLimit(
        ethers.BigNumber.from(15),
        ethers.BigNumber.from(10),
        2
      );
      expect(isWithinDeviationLimit).toEqual(true);
    });

    it('returns true if decrease is within the maxDeviationMultiplier limit', () => {
      const isWithinDeviationLimit = gasOracle.checkMaxDeviationLimit(
        ethers.BigNumber.from(10),
        ethers.BigNumber.from(15),
        2
      );
      expect(isWithinDeviationLimit).toEqual(true);
    });
  });

  describe('attemptGasOracleStrategy', () => {
    it('throws on invalid gasPriceOracle strategy', async () => {
      const goAttemptGasOraclePriceStrategy = await go(() =>
        gasOracle.attemptGasOracleStrategy(provider, { gasPriceStrategy: 'invalidStategy' } as any)
      );
      assertGoError(goAttemptGasOraclePriceStrategy);
      expect(goAttemptGasOraclePriceStrategy.error).toEqual(new Error('Unsupported gas price oracle strategy.'));
    });
  });

  describe('getGasPrice', () => {
    it('returns oracle gas price with legacy values', async () => {
      const getBlockWithTransactionsSpy = jest.spyOn(
        ethers.providers.StaticJsonRpcProvider.prototype,
        'getBlockWithTransactions'
      );
      const blockDataMock = [
        {
          number: 23,
          transactions: Array(20).fill({ gasPrice: ethers.BigNumber.from(22) }),
        },
        {
          number: 3,
          transactions: Array(20).fill({ gasPrice: ethers.BigNumber.from(20) }),
        },
      ];
      blockDataMock.forEach((block) => getBlockWithTransactionsSpy.mockImplementationOnce(async () => block as any));

      const [_logs, gasPrice] = await gasOracle.getGasPrice(provider, defaultGasPriceOracleOptions);

      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(1, 'latest');
      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(2, -20);
      expect(gasPrice).toEqual(ethers.BigNumber.from(22));
    });

    it('returns gas price with eip1559 values', async () => {
      const getBlockWithTransactionsSpy = jest.spyOn(
        ethers.providers.StaticJsonRpcProvider.prototype,
        'getBlockWithTransactions'
      );
      const blockDataMock = [
        {
          baseFeePerGas: ethers.BigNumber.from(20),
          number: 23,
          transactions: Array(20).fill({ maxPriorityFeePerGas: ethers.BigNumber.from(2) }),
        },
        {
          baseFeePerGas: ethers.BigNumber.from(18),
          number: 3,
          transactions: Array(20).fill({ maxPriorityFeePerGas: ethers.BigNumber.from(2) }),
        },
      ];
      blockDataMock.forEach((block) => getBlockWithTransactionsSpy.mockImplementationOnce(async () => block as any));

      const [_logs, gasPrice] = await gasOracle.getGasPrice(provider, defaultGasPriceOracleOptions);

      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(1, 'latest');
      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(2, -20);
      expect(gasPrice).toEqual(ethers.BigNumber.from(22));
    });

    it('returns providerRecommendedGasPrice if not enough blocks', async () => {
      const getBlockWithTransactionsSpy = jest.spyOn(
        ethers.providers.StaticJsonRpcProvider.prototype,
        'getBlockWithTransactions'
      );
      const blockDataMock = [
        {
          number: 23,
          transactions: Array(20).fill({ gasPrice: ethers.BigNumber.from(20) }),
        },
      ];
      blockDataMock.forEach((block) => getBlockWithTransactionsSpy.mockImplementationOnce(async () => block as any));
      const getGasPriceSpy = jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getGasPrice');
      const getGasPriceMock = ethers.BigNumber.from(11);
      getGasPriceSpy.mockImplementation(async () => getGasPriceMock);

      const [_logs, gasPrice] = await gasOracle.getGasPrice(provider, defaultGasPriceOracleOptions);
      // Check that the function returned the same value as the strategy-specific function
      const providerRecommendedGasPrice = await gasOracle.fetchProviderRecommendedGasPrice(
        provider,
        providerRecommendedGasPriceStrategy
      );

      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(1, 'latest');
      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(2, -20);
      expect(gasPrice).toEqual(providerRecommendedGasPrice);
    });

    it('returns providerRecommendedGasPrice if not enough transactions with legacy gas prices', async () => {
      const getBlockWithTransactionsSpy = jest.spyOn(
        ethers.providers.StaticJsonRpcProvider.prototype,
        'getBlockWithTransactions'
      );
      const blockDataMock = [
        {
          number: 23,
          transactions: Array(15).fill({ gasPrice: ethers.BigNumber.from(20) }),
        },
        {
          number: 3,
          transactions: Array(20).fill({ gasPrice: ethers.BigNumber.from(20) }),
        },
      ];
      blockDataMock.forEach((block) => getBlockWithTransactionsSpy.mockImplementationOnce(async () => block as any));
      const getGasPriceSpy = jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getGasPrice');
      const getGasPriceMock = ethers.BigNumber.from(11);
      getGasPriceSpy.mockImplementation(async () => getGasPriceMock);

      const [_logs, gasPrice] = await gasOracle.getGasPrice(provider, defaultGasPriceOracleOptions);
      // Check that the function returned the same value as the strategy-specific function
      const providerRecommendedGasPrice = await gasOracle.fetchProviderRecommendedGasPrice(
        provider,
        providerRecommendedGasPriceStrategy
      );

      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(1, 'latest');
      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(2, -20);
      expect(gasPrice).toEqual(providerRecommendedGasPrice);
    });

    it('returns providerRecommendedGasPrice if not enough transactions with eip1559 gas prices', async () => {
      const getBlockWithTransactionsSpy = jest.spyOn(
        ethers.providers.StaticJsonRpcProvider.prototype,
        'getBlockWithTransactions'
      );
      const blockDataMock = [
        {
          baseFeePerGas: ethers.BigNumber.from(20),
          number: 23,
          transactions: Array(15).fill({ maxPriorityFeePerGas: ethers.BigNumber.from(2) }),
        },
        {
          baseFeePerGas: ethers.BigNumber.from(18),
          number: 3,
          transactions: Array(20).fill({ maxPriorityFeePerGas: ethers.BigNumber.from(2) }),
        },
      ];

      blockDataMock.forEach((block) => getBlockWithTransactionsSpy.mockImplementationOnce(async () => block as any));
      const getGasPriceSpy = jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getGasPrice');
      const getGasPriceMock = ethers.BigNumber.from(11);
      getGasPriceSpy.mockImplementation(async () => getGasPriceMock);

      const [_logs, gasPrice] = await gasOracle.getGasPrice(provider, defaultGasPriceOracleOptions);
      // Check that the function returned the same value as the strategy-specific function
      const providerRecommendedGasPrice = await gasOracle.fetchProviderRecommendedGasPrice(
        provider,
        providerRecommendedGasPriceStrategy
      );

      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(1, 'latest');
      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(2, -20);
      expect(gasPrice).toEqual(providerRecommendedGasPrice);
    });

    it('returns providerRecommendedGasPrice if no block data', async () => {
      const getBlockWithTransactionsSpy = jest.spyOn(
        ethers.providers.StaticJsonRpcProvider.prototype,
        'getBlockWithTransactions'
      );

      const blockDataMock = [
        {
          number: 23,
          transactions: Array(20).fill({ gasPrice: ethers.BigNumber.from(22) }),
        },
        null,
      ];

      blockDataMock.forEach((block) => getBlockWithTransactionsSpy.mockImplementationOnce(async () => block as any));
      const getGasPriceSpy = jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getGasPrice');
      const getGasPriceMock = ethers.BigNumber.from(11);
      getGasPriceSpy.mockImplementation(async () => getGasPriceMock);

      const [_logs, gasPrice] = await gasOracle.getGasPrice(provider, defaultGasPriceOracleOptions);
      // Check that the function returned the same value as the strategy-specific function
      const providerRecommendedGasPrice = await gasOracle.fetchProviderRecommendedGasPrice(
        provider,
        providerRecommendedGasPriceStrategy
      );

      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(1, 'latest');
      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(2, -20);
      expect(gasPrice).toEqual(providerRecommendedGasPrice);
    });

    it('returns providerRecommendedGasPrice if no block transactions', async () => {
      const getBlockWithTransactionsSpy = jest.spyOn(
        ethers.providers.StaticJsonRpcProvider.prototype,
        'getBlockWithTransactions'
      );

      const blockDataMock = [
        {
          number: 23,
          transactions: Array(20).fill({ gasPrice: ethers.BigNumber.from(22) }),
        },
        {
          number: 3,
          transactions: null,
        },
      ];
      blockDataMock.forEach((block) => getBlockWithTransactionsSpy.mockImplementationOnce(async () => block as any));
      const getGasPriceSpy = jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getGasPrice');
      const getGasPriceMock = ethers.BigNumber.from(11);
      getGasPriceSpy.mockImplementation(async () => getGasPriceMock);

      const [_logs, gasPrice] = await gasOracle.getGasPrice(provider, defaultGasPriceOracleOptions);
      // Check that the function returned the same value as the strategy-specific function
      const providerRecommendedGasPrice = await gasOracle.fetchProviderRecommendedGasPrice(
        provider,
        providerRecommendedGasPriceStrategy
      );

      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(1, 'latest');
      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(2, -20);
      expect(gasPrice).toEqual(providerRecommendedGasPrice);
    });

    it('returns constantGasPrice if not enough blocks and fallback fails', async () => {
      const getBlockWithTransactionsSpy = jest.spyOn(
        ethers.providers.StaticJsonRpcProvider.prototype,
        'getBlockWithTransactions'
      );
      const blockDataMock = [
        {
          number: 23,
          transactions: [{ gasPrice: ethers.BigNumber.from(22) }, { gasPrice: ethers.BigNumber.from(22) }],
        },
        {
          number: 3,
          transactions: [{ gasPrice: ethers.BigNumber.from(20) }, { gasPrice: ethers.BigNumber.from(20) }],
        },
      ];
      blockDataMock.forEach((block) => getBlockWithTransactionsSpy.mockImplementationOnce(async () => block as any));
      const getGasPriceSpy = jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getGasPrice');
      getGasPriceSpy.mockImplementation(async () => {
        throw new Error('some error');
      });

      const [_logs, gasPrice] = await gasOracle.getGasPrice(provider, defaultGasPriceOracleOptions);
      const constantGasPrice = gasOracle.fetchConstantGasPrice(constantGasPriceStrategy);

      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(1, 'latest');
      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(2, -20);
      expect(gasPrice).toEqual(constantGasPrice);
    });

    it('returns constantGasPrice if failing to fetch both blocks and provider gas price', async () => {
      const getBlockWithTransactionsSpy = jest.spyOn(
        ethers.providers.StaticJsonRpcProvider.prototype,
        'getBlockWithTransactions'
      );
      getBlockWithTransactionsSpy.mockImplementation(async () => {
        throw new Error('some error');
      });
      const getGasPriceSpy = jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getGasPrice');
      getGasPriceSpy.mockImplementation(async () => {
        throw new Error('some error');
      });

      const [_logs, gasPrice] = await gasOracle.getGasPrice(provider, defaultGasPriceOracleOptions);
      const constantGasPrice = gasOracle.fetchConstantGasPrice(constantGasPriceStrategy);

      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(1, 'latest');
      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(2, -20);
      expect(gasPrice).toEqual(constantGasPrice);
    });

    it('retries provider getBlockWithTransactions', async () => {
      const getBlockWithTransactionsSpy = jest.spyOn(
        ethers.providers.StaticJsonRpcProvider.prototype,
        'getBlockWithTransactions'
      );
      getBlockWithTransactionsSpy.mockImplementation(async () => {
        throw new Error('some error');
      });
      // Mock random backoff time
      jest.spyOn(global.Math, 'random').mockImplementation(() => 0.5);

      await go(() =>
        gasOracle.processGasPriceOracleStrategies(
          provider,
          [latestBlockPercentileGasPriceStrategy, constantGasPriceStrategy] as config.GasPriceOracleConfig,
          Date.now()
        )
      );
      expect(getBlockWithTransactionsSpy).toHaveBeenCalledTimes(4);
    });

    it('retries provider getGasPrice', async () => {
      const getGasPriceSpy = jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getGasPrice');
      getGasPriceSpy.mockImplementation(async () => {
        throw new Error('some error');
      });
      // Mock random backoff time
      jest.spyOn(global.Math, 'random').mockImplementation(() => 0.5);

      await go(() =>
        gasOracle.processGasPriceOracleStrategies(
          provider,
          [providerRecommendedGasPriceStrategy, constantGasPriceStrategy],
          Date.now()
        )
      );
      expect(getGasPriceSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('handles timeouts', () => {
    it('return constantGasPrice after totalTimeoutMs is exceeded due to processGasPriceOracleStrategies timeout', async () => {
      const processGasPriceOracleStrategiesSpy = jest.spyOn(gasOracle, 'processGasPriceOracleStrategies');
      processGasPriceOracleStrategiesSpy.mockImplementation(
        async () =>
          new Promise((resolve) => {
            setTimeout(() => {
              return resolve([[], ethers.BigNumber.from(10)] as any);
            }, GAS_ORACLE_STRATEGY_MAX_TIMEOUT_MS);
          })
      );

      // totalTimeoutMs is 10 seconds and each strategy attempt has 2 attempts so
      // we need to attempt at least 5 strategies to test exceeding the totalTimeoutMs of getGasPrice
      const [_logs, gasPrice] = await gasOracle.getGasPrice(provider, defaultGasPriceOracleOptions);

      // processGasPriceOracleStrategiesSpy should have been called once when totalTimeoutMs is exceeded
      expect(processGasPriceOracleStrategiesSpy).toHaveBeenCalledTimes(1);
      expect(gasPrice).toEqual(gasOracle.fetchConstantGasPrice(constantGasPriceStrategy));
    });

    it('return constantGasPrice after totalTimeoutMs is exceeded due to attemptGasOracleStrategy timeout', async () => {
      const attemptGasOracleStrategySpy = jest.spyOn(gasOracle, 'attemptGasOracleStrategy');
      attemptGasOracleStrategySpy.mockImplementation(
        async () =>
          new Promise((resolve) => {
            setTimeout(() => {
              return resolve([[], ethers.BigNumber.from(10)] as any);
            }, GAS_ORACLE_STRATEGY_ATTEMPT_TIMEOUT_MS);
          })
      );
      // Mock random backoff time
      jest.spyOn(global.Math, 'random').mockImplementation(() => 0.4);

      // totalTimeoutMs is 10 seconds, each strategy attempt has 2 attempts, and so with a delay of 1 second to test exceeding totalTimeoutMs we need at least 3 strategies
      const [_logs, gasPrice] = await gasOracle.getGasPrice(provider, [
        latestBlockPercentileGasPriceStrategy,
        latestBlockPercentileGasPriceStrategy,
        latestBlockPercentileGasPriceStrategy,
        constantGasPriceStrategy,
      ]);

      // attemptGasOracleStrategySpy should have been called 4 times
      expect(attemptGasOracleStrategySpy).toHaveBeenCalledTimes(4);
      expect(gasPrice).toEqual(gasOracle.fetchConstantGasPrice(constantGasPriceStrategy));
    });
  });

  describe('handles unexpected getGasPrice errors', () => {
    it('returns constantGasPrice if all attemptGasOracleStrategy retries throw', async () => {
      const attemptGasOracleStrategySpy = jest.spyOn(gasOracle, 'attemptGasOracleStrategy');
      attemptGasOracleStrategySpy.mockRejectedValue({ success: false, error: 'Some error' });

      const [_logs, gasPrice] = await gasOracle.getGasPrice(provider, defaultGasPriceOracleOptions);

      expect(gasPrice).toEqual(gasOracle.fetchConstantGasPrice(constantGasPriceStrategy));
    });

    it('returns constantGasPrice if all strategy-specific functions throw', async () => {
      jest.spyOn(gasOracle, 'fetchLatestBlockPercentileGasPrice').mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      jest.spyOn(gasOracle, 'fetchProviderRecommendedGasPrice').mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const goGasPrice = await go(() => gasOracle.getGasPrice(provider, defaultGasPriceOracleOptions));
      // Ensure that getGasPrice did not throw
      assertGoSuccess(goGasPrice);
      const [_logs, gasPrice] = goGasPrice.data;
      expect(gasPrice).toEqual(gasOracle.fetchConstantGasPrice(constantGasPriceStrategy));
    });

    it('returns constantGasPrice if gasOracleConfig includes an invalid strategy', async () => {
      const [_logs, gasPrice] = await gasOracle.getGasPrice(provider, [
        { gasPriceStrategy: 'invalidStrategy' },
        constantGasPriceStrategy,
      ] as any);
      const constantGasPrice = gasOracle.fetchConstantGasPrice(constantGasPriceStrategy);

      expect(gasPrice).toEqual(constantGasPrice);
    });
  });
});
