import * as hre from 'hardhat';
import { BigNumber, ethers } from 'ethers';
import '@nomiclabs/hardhat-ethers';
import { go, assertGoSuccess } from '@api3/promise-utils';
import { config } from '@api3/airnode-validator';
import * as gasOracle from '../../src/evm/gas-prices/gas-oracle';
import { GasTarget } from '../../src/evm/gas-prices/types';
import { executeTransactions } from '../setup/transactions';

// Jest version 27 has a bug where jest.setTimeout does not work correctly inside describe or test blocks
// https://github.com/facebook/jest/issues/11607
jest.setTimeout(60_000);

const latestBlockPercentileGasPriceStrategy: config.LatestBlockPercentileGasPriceStrategy = {
  gasPriceStrategy: 'latestBlockPercentileGasPrice',
  percentile: 60,
  minTransactionCount: 20,
  pastToCompareInBlocks: 20,
  maxDeviationMultiplier: 5, // Set high to ensure that e2e tests do not use fallback
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

const multiplyGasPrice = (gasPrice: BigNumber, recommendedGasPriceMultiplier?: number) =>
  recommendedGasPriceMultiplier ? gasOracle.multiplyGasPrice(gasPrice, recommendedGasPriceMultiplier) : gasPrice;

const processBlockData = async (
  provider: ethers.providers.StaticJsonRpcProvider,
  blocksWithGasPrices: { blockNumber: number; gasPrices: BigNumber[] }[],
  percentile: number,
  maxDeviationMultiplier: number,
  fallbackGasPrice: config.Amount,
  recommendedGasPriceMultiplier: number
): Promise<GasTarget> => {
  const latestBlock = blocksWithGasPrices[0];
  const referenceBlock = blocksWithGasPrices[20];

  const latestBlockPercentileGasPrice = gasOracle.getPercentile(
    latestBlockPercentileGasPriceStrategy.percentile,
    latestBlock.gasPrices.map((p) => p)
  );
  const referenceBlockPercentileGasPrice = gasOracle.getPercentile(
    percentile,
    referenceBlock.gasPrices.map((p) => p)
  );

  const isWithinDeviationLimit = gasOracle.checkMaxDeviationLimit(
    latestBlockPercentileGasPrice!,
    referenceBlockPercentileGasPrice!,
    maxDeviationMultiplier
  );

  if (isWithinDeviationLimit) return { type: 0, gasPrice: latestBlockPercentileGasPrice! };

  try {
    const providerGasPrice = await provider.getGasPrice();
    return {
      type: 0,
      gasPrice: multiplyGasPrice(providerGasPrice, recommendedGasPriceMultiplier),
    };
  } catch (_e) {
    return {
      type: 0,
      gasPrice: gasOracle.parsePriorityFee(fallbackGasPrice),
    };
  }
};

describe('Gas oracle', () => {
  const txTypes: ('legacy' | 'eip1559')[] = ['legacy', 'eip1559'];
  const providerUrl = 'http://127.0.0.1:8545/';
  const provider = new hre.ethers.providers.StaticJsonRpcProvider(providerUrl);
  let startTime: number;

  txTypes.forEach((txType) => {
    describe(`${txType} network`, () => {
      let blocksWithGasPrices: { blockNumber: number; gasPrices: BigNumber[] }[];

      beforeEach(async () => {
        // Reset the local hardhat network state for each test to prevent issues with other test contracts
        await hre.network.provider.send('hardhat_reset');
        // Disable automining to get multiple transaction per block
        await hre.network.provider.send('evm_setAutomine', [false]);
        jest.resetAllMocks();
        jest.restoreAllMocks();

        const transactions = await executeTransactions(txType);

        blocksWithGasPrices = transactions.blocksWithGasPrices.sort((a, b) => b.blockNumber - a.blockNumber);

        // Set automining to true
        await hre.network.provider.send('evm_setAutomine', [true]);

        startTime = Date.now();
      });

      it('returns latestBlockPercentileGasPrice', async () => {
        const [_logs, gasTarget] = await gasOracle.getGasPrice(provider, defaultChainOptions);

        const processedPercentileGasPrice = await processBlockData(
          provider,
          blocksWithGasPrices,
          latestBlockPercentileGasPriceStrategy.percentile,
          latestBlockPercentileGasPriceStrategy.maxDeviationMultiplier,
          constantGasPriceStrategy.gasPrice as config.Amount,
          providerRecommendedGasPriceStrategy.recommendedGasPriceMultiplier
        );

        expect(gasTarget).toEqual(gasOracle.getGasTargetWithGasLimit(processedPercentileGasPrice, fulfillmentGasLimit));
      });

      it('returns providerRecommendedEip1559GasPrice', async () => {
        const [_logs, gasTarget] = await gasOracle.getGasPrice(provider, {
          ...defaultChainOptions,
          gasPriceOracle: [providerRecommendedEip1559GasPriceStrategy, constantGasPriceStrategy],
        });
        const providerRecommendedEip1559GasPrice = await gasOracle.fetchProviderRecommendedEip1559GasPrice(
          provider,
          providerRecommendedEip1559GasPriceStrategy,
          startTime
        );

        expect(gasTarget).toEqual(
          gasOracle.getGasTargetWithGasLimit(providerRecommendedEip1559GasPrice, fulfillmentGasLimit)
        );
      });

      it('returns providerRecommendedGasPrice if maxDeviationMultiplier is exceeded', async () => {
        const gasPriceOracleOptions: config.GasPriceOracleConfig = [
          {
            ...latestBlockPercentileGasPriceStrategy,
            // Set a low maxDeviationMultiplier to test getGasPrice fallback
            maxDeviationMultiplier: 0.01,
          },
          providerRecommendedGasPriceStrategy,
          constantGasPriceStrategy,
        ];

        const [_logs, gasTarget] = await gasOracle.getGasPrice(provider, {
          ...defaultChainOptions,
          gasPriceOracle: gasPriceOracleOptions,
        });
        const providerRecommendedGasPrice = await gasOracle.fetchProviderRecommendedGasPrice(
          provider,
          providerRecommendedGasPriceStrategy,
          startTime
        );

        expect(gasTarget).toEqual(gasOracle.getGasTargetWithGasLimit(providerRecommendedGasPrice, fulfillmentGasLimit));
      });

      it('returns providerRecommendedGasPrice if getBlockWithTransactions provider calls fail', async () => {
        const getBlockWithTransactionsSpy = jest.spyOn(
          hre.ethers.providers.StaticJsonRpcProvider.prototype,
          'getBlockWithTransactions'
        );
        getBlockWithTransactionsSpy.mockImplementation(async () => {
          throw new Error('some error');
        });

        const [_logs, gasTarget] = await gasOracle.getGasPrice(provider, defaultChainOptions);
        const providerRecommendedGasPrice = await gasOracle.fetchProviderRecommendedGasPrice(
          provider,
          providerRecommendedGasPriceStrategy,
          startTime
        );

        expect(gasTarget).toEqual(gasOracle.getGasTargetWithGasLimit(providerRecommendedGasPrice, fulfillmentGasLimit));
      });

      it('returns constantGasPrice if getBlockWithTransactions and getGasPrice provider calls fail', async () => {
        const getBlockWithTransactionsSpy = jest.spyOn(
          hre.ethers.providers.StaticJsonRpcProvider.prototype,
          'getBlockWithTransactions'
        );
        const getGasPriceSpy = jest.spyOn(hre.ethers.providers.StaticJsonRpcProvider.prototype, 'getGasPrice');
        getBlockWithTransactionsSpy.mockImplementation(async () => {
          throw new Error('some error');
        });
        getGasPriceSpy.mockImplementation(async () => {
          throw new Error('some error');
        });

        const [_logs, gasTarget] = await gasOracle.getGasPrice(provider, defaultChainOptions);
        const constantGasPrice = gasOracle.fetchConstantGasPrice(constantGasPriceStrategy);

        expect(gasTarget).toEqual(gasOracle.getGasTargetWithGasLimit(constantGasPrice, fulfillmentGasLimit));
      });

      describe('handles unexpected errors', () => {
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
      });
    });
  });
});
