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
  const providerRecommendedEip1559GasPriceStrategy: config.ProviderRecommendedEip1559GasPriceStrategy = {
    gasPriceStrategy: 'providerRecommendedEip1559GasPrice',
    baseFeeMultiplier: 2,
    priorityFee: {
      value: 3.12,
      unit: 'gwei',
    },
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
  const fulfillmentGasLimit = 500_000;
  const defaultChainOptions: config.ChainOptions = {
    gasPriceOracle: defaultGasPriceOracleOptions,
    fulfillmentGasLimit,
  };

  let startTime: number;

  beforeEach(() => {
    jest.restoreAllMocks();
    startTime = Date.now();
  });

  describe('parsePriorityFee', () => {
    [
      [{ value: 123, unit: 'wei' }, ethers.BigNumber.from('123')],
      [{ value: 123.4, unit: 'kwei' }, ethers.BigNumber.from('123400')],
      [{ value: 123.4, unit: 'mwei' }, ethers.BigNumber.from('123400000')],
      [{ value: 123.4, unit: 'gwei' }, ethers.BigNumber.from('123400000000')],
      [{ value: 123.4, unit: 'szabo' }, ethers.BigNumber.from('123400000000000')],
      [{ value: 123.4, unit: 'finney' }, ethers.BigNumber.from('123400000000000000')],
      [{ value: 123.4, unit: 'ether' }, ethers.BigNumber.from('123400000000000000000')],
    ].forEach(([input, result]: (any | ethers.BigNumber)[]) =>
      it('returns parsed wei from numbers - %#', () => {
        const priorityFeeInWei = gasOracle.parsePriorityFee(input);
        expect(priorityFeeInWei).toEqual(result);
      })
    );

    [
      { value: 3.12, unit: 'pence' },
      { value: '3.1p', unit: 'gwei' },
      { value: 3.12, unit: 'wei' },
    ].forEach((input: any) =>
      it('throws an error for an invalid decimal denominated string, number and unit - %#', () => {
        const throwingFunction = () => gasOracle.parsePriorityFee(input);
        expect(throwingFunction).toThrow();
      })
    );
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
        gasOracle.attemptGasOracleStrategy(provider, { gasPriceStrategy: 'invalidStategy' } as any, startTime)
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

      const [_logs, gasTarget] = await gasOracle.getGasPrice(provider, defaultChainOptions);

      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(1, 'latest');
      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(2, -20);
      expect(gasTarget).toEqual(
        gasOracle.getGasTargetWithGasLimit({ gasPrice: ethers.BigNumber.from(22), type: 0 }, fulfillmentGasLimit)
      );
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

      const [_logs, gasTarget] = await gasOracle.getGasPrice(provider, defaultChainOptions);

      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(1, 'latest');
      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(2, -20);
      expect(gasTarget).toEqual(
        gasOracle.getGasTargetWithGasLimit({ gasPrice: ethers.BigNumber.from(22), type: 0 }, fulfillmentGasLimit)
      );
    });

    it('returns providerRecommendedEip1559GasPrice', async () => {
      jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getBlock').mockImplementation(
        async () =>
          ({
            baseFeePerGas: ethers.BigNumber.from(18),
          } as any)
      );

      const [_logs, gasTarget] = await gasOracle.getGasPrice(provider, {
        ...defaultChainOptions,
        gasPriceOracle: [providerRecommendedEip1559GasPriceStrategy, constantGasPriceStrategy],
      });
      const providerRecommendedEip1559GasTarget = await gasOracle.fetchProviderRecommendedEip1559GasPrice(
        provider,
        providerRecommendedEip1559GasPriceStrategy,
        startTime
      );

      expect(gasTarget).toEqual(
        gasOracle.getGasTargetWithGasLimit(providerRecommendedEip1559GasTarget, fulfillmentGasLimit)
      );
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

      const [_logs, gasTarget] = await gasOracle.getGasPrice(provider, defaultChainOptions);
      // Check that the function returned the same value as the strategy-specific function
      const providerRecommendedGasTarget = await gasOracle.fetchProviderRecommendedGasPrice(
        provider,
        providerRecommendedGasPriceStrategy,
        startTime
      );

      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(1, 'latest');
      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(2, -20);
      expect(gasTarget).toEqual(gasOracle.getGasTargetWithGasLimit(providerRecommendedGasTarget, fulfillmentGasLimit));
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

      const [_logs, gasTarget] = await gasOracle.getGasPrice(provider, defaultChainOptions);
      // Check that the function returned the same value as the strategy-specific function
      const providerRecommendedGasPrice = await gasOracle.fetchProviderRecommendedGasPrice(
        provider,
        providerRecommendedGasPriceStrategy,
        startTime
      );

      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(1, 'latest');
      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(2, -20);
      expect(gasTarget).toEqual(gasOracle.getGasTargetWithGasLimit(providerRecommendedGasPrice, fulfillmentGasLimit));
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

      const [_logs, gasTarget] = await gasOracle.getGasPrice(provider, defaultChainOptions);
      // Check that the function returned the same value as the strategy-specific function
      const providerRecommendedGasPrice = await gasOracle.fetchProviderRecommendedGasPrice(
        provider,
        providerRecommendedGasPriceStrategy,
        startTime
      );

      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(1, 'latest');
      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(2, -20);
      expect(gasTarget).toEqual(gasOracle.getGasTargetWithGasLimit(providerRecommendedGasPrice, fulfillmentGasLimit));
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

      const [_logs, gasTarget] = await gasOracle.getGasPrice(provider, defaultChainOptions);
      // Check that the function returned the same value as the strategy-specific function
      const providerRecommendedGasPrice = await gasOracle.fetchProviderRecommendedGasPrice(
        provider,
        providerRecommendedGasPriceStrategy,
        startTime
      );

      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(1, 'latest');
      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(2, -20);
      expect(gasTarget).toEqual(gasOracle.getGasTargetWithGasLimit(providerRecommendedGasPrice, fulfillmentGasLimit));
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

      const [_logs, gasTarget] = await gasOracle.getGasPrice(provider, defaultChainOptions);
      // Check that the function returned the same value as the strategy-specific function
      const providerRecommendedGasPrice = await gasOracle.fetchProviderRecommendedGasPrice(
        provider,
        providerRecommendedGasPriceStrategy,
        startTime
      );

      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(1, 'latest');
      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(2, -20);
      expect(gasTarget).toEqual(gasOracle.getGasTargetWithGasLimit(providerRecommendedGasPrice, fulfillmentGasLimit));
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

      const [_logs, gasTarget] = await gasOracle.getGasPrice(provider, defaultChainOptions);
      const constantGasPrice = gasOracle.fetchConstantGasPrice(constantGasPriceStrategy);

      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(1, 'latest');
      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(2, -20);
      expect(gasTarget).toEqual(gasOracle.getGasTargetWithGasLimit(constantGasPrice, fulfillmentGasLimit));
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

      const [_logs, gasTarget] = await gasOracle.getGasPrice(provider, defaultChainOptions);
      const constantGasPrice = gasOracle.fetchConstantGasPrice(constantGasPriceStrategy);

      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(1, 'latest');
      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(2, -20);
      expect(gasTarget).toEqual(gasOracle.getGasTargetWithGasLimit(constantGasPrice, fulfillmentGasLimit));
    });

    it('returns constantGasPrice if processGasPriceOracleStrategies returns null', async () => {
      const processGasPriceOracleStrategiesSpy = jest.spyOn(gasOracle, 'processGasPriceOracleStrategies');
      processGasPriceOracleStrategiesSpy.mockImplementation(async () => [[], null]);

      const [_logs, gasTarget] = await gasOracle.getGasPrice(provider, defaultChainOptions);
      const constantGasPrice = gasOracle.fetchConstantGasPrice(constantGasPriceStrategy);

      expect(gasTarget).toEqual(gasOracle.getGasTargetWithGasLimit(constantGasPrice, fulfillmentGasLimit));
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
        gasOracle.processGasPriceOracleStrategies(provider, [
          latestBlockPercentileGasPriceStrategy,
          constantGasPriceStrategy,
        ] as config.GasPriceOracleConfig)
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
        gasOracle.processGasPriceOracleStrategies(provider, [
          providerRecommendedGasPriceStrategy,
          constantGasPriceStrategy,
        ])
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
      const [_logs, gasTarget] = await gasOracle.getGasPrice(provider, defaultChainOptions);
      const constantGasPrice = gasOracle.fetchConstantGasPrice(constantGasPriceStrategy);

      // processGasPriceOracleStrategiesSpy should have been called once when totalTimeoutMs is exceeded
      expect(processGasPriceOracleStrategiesSpy).toHaveBeenCalledTimes(1);
      expect(gasTarget).toEqual(gasOracle.getGasTargetWithGasLimit(constantGasPrice, fulfillmentGasLimit));
    });

    it('return constantGasPrice after totalTimeoutMs is exceeded due to attemptGasOracleStrategy timeout', async () => {
      const attemptGasOracleStrategySpy = jest.spyOn(gasOracle, 'attemptGasOracleStrategy');
      attemptGasOracleStrategySpy.mockImplementation(
        async () =>
          new Promise((resolve) => {
            setTimeout(() => {
              return resolve([[], ethers.BigNumber.from(33)] as any);
            }, GAS_ORACLE_STRATEGY_MAX_TIMEOUT_MS);
          })
      );
      // Mock random backoff time
      jest.spyOn(global.Math, 'random').mockImplementation(() => 0.4);

      // We only need 1 strategy as we are testing attemptGasOracleStrategy timeout
      const [_logs, gasTarget] = await gasOracle.getGasPrice(provider, {
        ...defaultChainOptions,
        gasPriceOracle: [latestBlockPercentileGasPriceStrategy, constantGasPriceStrategy],
      });
      const constantGasPrice = gasOracle.fetchConstantGasPrice(constantGasPriceStrategy);

      // attemptGasOracleStrategy should have been called once when totalTimeoutMs is exceeded
      expect(attemptGasOracleStrategySpy).toHaveBeenCalledTimes(1);
      expect(gasTarget).toEqual(gasOracle.getGasTargetWithGasLimit(constantGasPrice, fulfillmentGasLimit));
    });

    it('return constantGasPrice after totalTimeoutMs is exceeded due to provider timeouts', async () => {
      const getBlockWithTransactionsSpy = jest.spyOn(
        ethers.providers.StaticJsonRpcProvider.prototype,
        'getBlockWithTransactions'
      );
      getBlockWithTransactionsSpy.mockImplementation(
        async () =>
          new Promise((resolve) => {
            setTimeout(() => {
              return resolve({} as any);
              // Set timeout to exceed attempt maximum
            }, GAS_ORACLE_STRATEGY_ATTEMPT_TIMEOUT_MS + 10);
          })
      );
      const getGasPriceSpy = jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getGasPrice');
      getGasPriceSpy.mockImplementation(
        async () =>
          new Promise((resolve) => {
            setTimeout(() => {
              return resolve(ethers.BigNumber.from(33) as any);
              // Set timeout to exceed attempt maximum
            }, GAS_ORACLE_STRATEGY_ATTEMPT_TIMEOUT_MS + 10);
          })
      );
      const getBlock = jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getBlock');
      // Mock random backoff time
      jest.spyOn(global.Math, 'random').mockImplementation(() => 0.4);

      // totalTimeoutMs is 10 seconds and each provider call has 2 attempts so with a 2.5 second delay
      // we need to attempt at least 3 strategies to test exceeding the totalTimeoutMs
      const [_logs, gasTarget] = await gasOracle.getGasPrice(provider, {
        ...defaultChainOptions,
        gasPriceOracle: [
          latestBlockPercentileGasPriceStrategy,
          providerRecommendedGasPriceStrategy,
          providerRecommendedEip1559GasPriceStrategy,
          constantGasPriceStrategy,
        ],
      });
      const constantGasPrice = gasOracle.fetchConstantGasPrice(constantGasPriceStrategy);

      // getBlockWithTransactions should have been called 4 times (i.e. one strategy with two retry attempts for two blocks each)
      expect(getBlockWithTransactionsSpy).toHaveBeenCalledTimes(4);
      expect(getGasPriceSpy).toHaveBeenCalledTimes(2);
      // totalTimeoutMs would have been exceeded and the third strategy would not have been attempted
      expect(getBlock).not.toHaveBeenCalled();
      expect(gasTarget).toEqual(gasOracle.getGasTargetWithGasLimit(constantGasPrice, fulfillmentGasLimit));
    });
  });

  describe('handles unexpected getGasPrice errors', () => {
    it('returns constantGasPrice if all attemptGasOracleStrategy retries throw', async () => {
      const attemptGasOracleStrategySpy = jest.spyOn(gasOracle, 'attemptGasOracleStrategy');
      attemptGasOracleStrategySpy.mockRejectedValue({ success: false, error: 'Some error' });

      const [_logs, gasTarget] = await gasOracle.getGasPrice(provider, defaultChainOptions);
      const constantGasPrice = gasOracle.fetchConstantGasPrice(constantGasPriceStrategy);

      expect(gasTarget).toEqual(gasOracle.getGasTargetWithGasLimit(constantGasPrice, fulfillmentGasLimit));
    });

    it('returns constantGasPrice if all strategy-specific functions throw', async () => {
      jest.spyOn(gasOracle, 'fetchLatestBlockPercentileGasPrice').mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      jest.spyOn(gasOracle, 'fetchProviderRecommendedGasPrice').mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const goGasPrice = await go(() => gasOracle.getGasPrice(provider, defaultChainOptions));
      // Ensure that getGasPrice did not throw
      assertGoSuccess(goGasPrice);
      const [_logs, gasTarget] = goGasPrice.data;

      const constantGasPrice = gasOracle.fetchConstantGasPrice(constantGasPriceStrategy);
      expect(gasTarget).toEqual(gasOracle.getGasTargetWithGasLimit(constantGasPrice, fulfillmentGasLimit));
    });

    it('returns constantGasPrice if gasOracleConfig includes an invalid strategy', async () => {
      const [_logs, gasTarget] = await gasOracle.getGasPrice(provider, {
        ...defaultChainOptions,
        gasPriceOracle: [{ gasPriceStrategy: 'invalidStrategy' }, constantGasPriceStrategy] as any,
      });
      const constantGasPrice = gasOracle.fetchConstantGasPrice(constantGasPriceStrategy);

      expect(gasTarget).toEqual(gasOracle.getGasTargetWithGasLimit(constantGasPrice, fulfillmentGasLimit));
    });
  });
});
