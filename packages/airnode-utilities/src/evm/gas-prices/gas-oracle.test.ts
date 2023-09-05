import { BigNumber, ethers } from 'ethers';
import { go, assertGoError, assertGoSuccess } from '@api3/promise-utils';
import { advanceTimersByTime } from '@api3/airnode-utilities';
import { config } from '@api3/airnode-validator';
import * as gasOracle from './gas-oracle';
import {
  GAS_ORACLE_STRATEGY_ATTEMPT_TIMEOUT_MS,
  GAS_ORACLE_STRATEGY_MAX_TIMEOUT_MS,
  GAS_ORACLE_RANDOM_BACKOFF_MAX_MS,
  GAS_ORACLE_RANDOM_BACKOFF_MIN_MS,
} from '../../constants';

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
  const sanitizedProviderRecommendedGasPriceStrategy: config.SanitizedProviderRecommendedGasPriceStrategy = {
    gasPriceStrategy: 'sanitizedProviderRecommendedGasPrice',
    recommendedGasPriceMultiplier: 1.2,
    baseFeeMultiplier: 2,
    baseFeeMultiplierThreshold: 5,
    priorityFee: {
      value: 3.0,
      unit: 'gwei',
    },
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

  describe('fetchSanitizedProviderRecommendedGasPrice', () => {
    it('throws an error when block data cannot be fetched', async () => {
      jest
        .spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getBlock')
        .mockRejectedValue(new Error('RPC failed to respond'));

      await expect(
        gasOracle.fetchSanitizedProviderRecommendedGasPrice(
          provider,
          sanitizedProviderRecommendedGasPriceStrategy,
          startTime
        )
      ).rejects.toThrow(new Error(`Unable to get provider recommended EIP1559 gas price.`));
    });

    it('throws an error when block data does not include baseFeePerGas', async () => {
      jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getBlock').mockResolvedValueOnce({} as any);

      await expect(
        gasOracle.fetchSanitizedProviderRecommendedGasPrice(
          provider,
          sanitizedProviderRecommendedGasPriceStrategy,
          startTime
        )
      ).rejects.toThrow(new Error(`Unable to get provider recommended EIP1559 gas price.`));
    });

    it('returns sanitized provider recommended gas target when variation between providerRecommendedGasPrice and baseFeePerGas exceeds threshold', async () => {
      const getBlockMock = { baseFeePerGas: ethers.BigNumber.from(100000000000) }; // 100 gwei
      const getGasPriceMock = ethers.BigNumber.from(600000000000); // 600 gwei
      jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getBlock').mockResolvedValue(getBlockMock as any);
      jest
        .spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getGasPrice')
        .mockResolvedValueOnce(getGasPriceMock);

      const expectedGasTarget = { type: 0, gasPrice: ethers.BigNumber.from(203000000000) }; // 203 gwei
      const sanitizedGasTarget = await gasOracle.fetchSanitizedProviderRecommendedGasPrice(
        provider,
        sanitizedProviderRecommendedGasPriceStrategy,
        startTime
      );
      expect(sanitizedGasTarget).toEqual(expectedGasTarget);
    });

    it('returns provider recommended gas target when variation between providerRecommendedGasPrice and baseFeePerGas within threshold', async () => {
      const getBlockMock = { baseFeePerGas: ethers.BigNumber.from(100000000000) }; // 100 gwei
      const getGasPriceMock = ethers.BigNumber.from(300000000000); // 300 gwei
      jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getBlock').mockResolvedValue(getBlockMock as any);
      jest
        .spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getGasPrice')
        .mockResolvedValueOnce(getGasPriceMock);

      const expectedGasTarget = { type: 0, gasPrice: ethers.BigNumber.from(360000000000) }; // 360 gwei
      const sanitizedGasTarget = await gasOracle.fetchSanitizedProviderRecommendedGasPrice(
        provider,
        sanitizedProviderRecommendedGasPriceStrategy,
        startTime
      );
      expect(sanitizedGasTarget).toEqual(expectedGasTarget);
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
      blockDataMock.forEach((block) =>
        getBlockWithTransactionsSpy.mockImplementationOnce(() => Promise.resolve(block as any))
      );

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
      blockDataMock.forEach((block) =>
        getBlockWithTransactionsSpy.mockImplementationOnce(() => Promise.resolve(block as any))
      );

      const [_logs, gasTarget] = await gasOracle.getGasPrice(provider, defaultChainOptions);

      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(1, 'latest');
      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(2, -20);
      expect(gasTarget).toEqual(
        gasOracle.getGasTargetWithGasLimit({ gasPrice: ethers.BigNumber.from(22), type: 0 }, fulfillmentGasLimit)
      );
    });

    it('returns providerRecommendedEip1559GasPrice', async () => {
      jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getBlock').mockImplementation(
        () =>
          ({
            baseFeePerGas: ethers.BigNumber.from(18),
          }) as any
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

    it('returns sanitizedProviderRecommendedGasPrice', async () => {
      jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getBlock').mockImplementation(
        () =>
          ({
            baseFeePerGas: ethers.BigNumber.from(18),
          }) as any
      );
      jest
        .spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getGasPrice')
        .mockImplementation(() => Promise.resolve(ethers.BigNumber.from(11)));

      const [_logs, gasTarget] = await gasOracle.getGasPrice(provider, {
        ...defaultChainOptions,
        gasPriceOracle: [sanitizedProviderRecommendedGasPriceStrategy, constantGasPriceStrategy],
      });
      const sanitizedProviderRecommendedGasTarget = await gasOracle.fetchSanitizedProviderRecommendedGasPrice(
        provider,
        sanitizedProviderRecommendedGasPriceStrategy,
        startTime
      );

      expect(gasTarget).toEqual(
        gasOracle.getGasTargetWithGasLimit(sanitizedProviderRecommendedGasTarget, fulfillmentGasLimit)
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
      blockDataMock.forEach((block) =>
        getBlockWithTransactionsSpy.mockImplementationOnce(() => Promise.resolve(block as any))
      );
      const getGasPriceSpy = jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getGasPrice');
      const getGasPriceMock = ethers.BigNumber.from(11);
      getGasPriceSpy.mockImplementation(() => Promise.resolve(getGasPriceMock));

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
      blockDataMock.forEach((block) =>
        getBlockWithTransactionsSpy.mockImplementationOnce(() => Promise.resolve(block as any))
      );
      const getGasPriceSpy = jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getGasPrice');
      const getGasPriceMock = ethers.BigNumber.from(11);
      getGasPriceSpy.mockImplementation(() => Promise.resolve(getGasPriceMock));

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

      blockDataMock.forEach((block) =>
        getBlockWithTransactionsSpy.mockImplementationOnce(() => Promise.resolve(block as any))
      );
      const getGasPriceSpy = jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getGasPrice');
      const getGasPriceMock = ethers.BigNumber.from(11);
      getGasPriceSpy.mockImplementation(() => Promise.resolve(getGasPriceMock));

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

      blockDataMock.forEach((block) =>
        getBlockWithTransactionsSpy.mockImplementationOnce(() => Promise.resolve(block as any))
      );
      const getGasPriceSpy = jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getGasPrice');
      const getGasPriceMock = ethers.BigNumber.from(11);
      getGasPriceSpy.mockImplementation(() => Promise.resolve(getGasPriceMock));

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
      blockDataMock.forEach((block) =>
        getBlockWithTransactionsSpy.mockImplementationOnce(() => Promise.resolve(block as any))
      );
      const getGasPriceSpy = jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getGasPrice');
      const getGasPriceMock = ethers.BigNumber.from(11);
      getGasPriceSpy.mockImplementation(() => Promise.resolve(getGasPriceMock));

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
      blockDataMock.forEach((block) =>
        getBlockWithTransactionsSpy.mockImplementationOnce(() => Promise.resolve(block as any))
      );
      const getGasPriceSpy = jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getGasPrice');
      getGasPriceSpy.mockRejectedValue(new Error('some error'));

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
      getBlockWithTransactionsSpy.mockRejectedValue(new Error('some error'));
      const getGasPriceSpy = jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getGasPrice');
      getGasPriceSpy.mockRejectedValue(new Error('some error'));

      const [_logs, gasTarget] = await gasOracle.getGasPrice(provider, defaultChainOptions);
      const constantGasPrice = gasOracle.fetchConstantGasPrice(constantGasPriceStrategy);

      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(1, 'latest');
      expect(getBlockWithTransactionsSpy).toHaveBeenNthCalledWith(2, -20);
      expect(gasTarget).toEqual(gasOracle.getGasTargetWithGasLimit(constantGasPrice, fulfillmentGasLimit));
    });

    it('returns constantGasPrice if processGasPriceOracleStrategies returns null', async () => {
      const processGasPriceOracleStrategiesSpy = jest.spyOn(gasOracle, 'processGasPriceOracleStrategies');
      processGasPriceOracleStrategiesSpy.mockImplementation(() => Promise.resolve([[], null]));

      const [_logs, gasTarget] = await gasOracle.getGasPrice(provider, defaultChainOptions);
      const constantGasPrice = gasOracle.fetchConstantGasPrice(constantGasPriceStrategy);

      expect(gasTarget).toEqual(gasOracle.getGasTargetWithGasLimit(constantGasPrice, fulfillmentGasLimit));
    });

    it('retries provider getBlockWithTransactions', async () => {
      const getBlockWithTransactionsSpy = jest.spyOn(
        ethers.providers.StaticJsonRpcProvider.prototype,
        'getBlockWithTransactions'
      );
      getBlockWithTransactionsSpy.mockRejectedValue(new Error('some error'));
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
      getGasPriceSpy.mockRejectedValue(new Error('some error'));
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
    beforeEach(() => {
      jest.useFakeTimers();
    });

    const expectedConstantGasTarget = {
      gasLimit: BigNumber.from(500000),
      gasPrice: BigNumber.from(10000000000),
      type: 0,
    };

    it('due to processGasPriceOracleStrategies timeout', async () => {
      const processGasPriceOracleStrategiesSpy = jest.spyOn(gasOracle, 'processGasPriceOracleStrategies');
      processGasPriceOracleStrategiesSpy.mockImplementation(() => new Promise(() => {})); // never resolve

      const gasPricePromise = gasOracle.getGasPrice(provider, defaultChainOptions);
      await advanceTimersByTime(GAS_ORACLE_STRATEGY_MAX_TIMEOUT_MS);
      const [_logs, gasTarget] = await gasPricePromise;

      expect(processGasPriceOracleStrategiesSpy).toHaveBeenCalledTimes(1);
      expect(gasTarget).toEqual(expectedConstantGasTarget);
    });

    it('due to attemptGasOracleStrategy timeout', async () => {
      const attemptGasOracleStrategySpy = jest.spyOn(gasOracle, 'attemptGasOracleStrategy');
      attemptGasOracleStrategySpy.mockImplementation(
        () => new Promise(() => {}) // never resolve
      );
      // Mock random backoff time
      jest.spyOn(global.Math, 'random').mockImplementation(() => 0.4);

      const gasPricePromise = gasOracle.getGasPrice(provider, {
        ...defaultChainOptions,
        // We only need 1 non constant gas strategy as we are testing attemptGasOracleStrategy timeout
        gasPriceOracle: [latestBlockPercentileGasPriceStrategy, constantGasPriceStrategy],
      });
      await advanceTimersByTime(GAS_ORACLE_STRATEGY_MAX_TIMEOUT_MS);
      const [_logs, gasTarget] = await gasPricePromise;

      // attemptGasOracleStrategy should have been called once when totalTimeoutMs is exceeded
      expect(attemptGasOracleStrategySpy).toHaveBeenCalledTimes(1);
      expect(gasTarget).toEqual(expectedConstantGasTarget);
    });

    it('due to provider timeouts', async () => {
      const getBlockWithTransactionsSpy = jest.spyOn(
        ethers.providers.StaticJsonRpcProvider.prototype,
        'getBlockWithTransactions'
      );
      getBlockWithTransactionsSpy.mockImplementation(
        () => new Promise(() => {}) // never resolve
      );
      const getGasPriceSpy = jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getGasPrice');
      getGasPriceSpy.mockImplementation(
        () => new Promise(() => {}) // never resolve
      );
      const getBlock = jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getBlock');
      // Mock random backoff time
      jest.spyOn(global.Math, 'random').mockImplementation(() => 0.4);
      const delayMs =
        0.4 * (GAS_ORACLE_RANDOM_BACKOFF_MAX_MS - GAS_ORACLE_RANDOM_BACKOFF_MIN_MS) + GAS_ORACLE_RANDOM_BACKOFF_MIN_MS;

      // totalTimeoutMs is 10 seconds and each strategy has 2 attempts with a ~1 second retry delay.
      // We need to attempt at least 3 strategies before exceeding the totalTimeoutMs
      const gasPricePromise = gasOracle.getGasPrice(provider, {
        ...defaultChainOptions,
        gasPriceOracle: [
          latestBlockPercentileGasPriceStrategy,
          providerRecommendedGasPriceStrategy,
          providerRecommendedEip1559GasPriceStrategy,
          constantGasPriceStrategy,
        ],
      });

      expect(getBlockWithTransactionsSpy).toHaveBeenCalledTimes(2);
      await advanceTimersByTime(GAS_ORACLE_STRATEGY_ATTEMPT_TIMEOUT_MS); // attempt latestBlockPercentileGasPriceStrategy
      await advanceTimersByTime(delayMs); // delay
      expect(getBlockWithTransactionsSpy).toHaveBeenCalledTimes(4);
      await advanceTimersByTime(GAS_ORACLE_STRATEGY_ATTEMPT_TIMEOUT_MS); // retry latestBlockPercentileGasPriceStrategy
      // TODO: This is a bug in promise utils. There should not be a delay after last attempt
      await advanceTimersByTime(delayMs); // delay

      expect(getGasPriceSpy).toHaveBeenCalledTimes(1);
      await advanceTimersByTime(GAS_ORACLE_STRATEGY_ATTEMPT_TIMEOUT_MS); // attempt providerRecommendedGasPriceStrategy
      await advanceTimersByTime(delayMs); // delay
      expect(getGasPriceSpy).toHaveBeenCalledTimes(2);
      await advanceTimersByTime(GAS_ORACLE_STRATEGY_ATTEMPT_TIMEOUT_MS); // retry providerRecommendedGasPriceStrategy

      const [_logs, gasTarget] = await gasPricePromise; // at this point the promise should have already timeouted
      // Note: The third strategy eventually gets called because there is no way to cancel running promise. The result
      // of this strategy is ignored though (because of timeout) and constant price is returned
      // TODO: promise utils should not call the attempt callback if timeout is negative
      expect(getBlock).toHaveBeenCalledTimes(1);
      expect(gasTarget).toEqual(expectedConstantGasTarget);
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
      jest.spyOn(gasOracle, 'fetchLatestBlockPercentileGasPrice').mockRejectedValue(new Error('Unexpected error'));
      jest.spyOn(gasOracle, 'fetchProviderRecommendedGasPrice').mockRejectedValue(new Error('Unexpected error'));

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
