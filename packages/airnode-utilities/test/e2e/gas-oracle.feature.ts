import * as hre from 'hardhat';
import { BigNumber } from 'ethers';
import '@nomiclabs/hardhat-ethers';
import { config } from '@api3/airnode-validator';
import * as gasOracle from '../../src/evm/gas-prices/gas-oracle';
import * as gasPrices from '../../src/evm/gas-prices/gas-prices';
import { PriorityFee } from '../../src/evm/gas-prices/types';
// import { buildAirseekerConfig, buildLocalSecrets } from '../fixtures/config';
import { executeTransactions } from '../setup/transactions';

// Jest version 27 has a bug where jest.setTimeout does not work correctly inside describe or test blocks
// https://github.com/facebook/jest/issues/11607
jest.setTimeout(60_000);

const providerUrl = 'http://127.0.0.1:8545/';
const provider = new hre.ethers.providers.StaticJsonRpcProvider(providerUrl);

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

const multiplyGasPrice = (gasPrice: BigNumber, recommendedGasPriceMultiplier?: number) =>
  recommendedGasPriceMultiplier ? gasPrices.multiplyGasPrice(gasPrice, recommendedGasPriceMultiplier) : gasPrice;

const processBlockData = async (
  blocksWithGasPrices: { blockNumber: number; gasPrices: BigNumber[] }[],
  percentile: number,
  maxDeviationMultiplier: number,
  fallbackGasPrice: PriorityFee,
  recommendedGasPriceMultiplier: number
) => {
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

  if (isWithinDeviationLimit) return latestBlockPercentileGasPrice;

  try {
    const providerGasPrice = await provider.getGasPrice();
    return multiplyGasPrice(providerGasPrice, recommendedGasPriceMultiplier);
  } catch (_e) {
    return gasPrices.parsePriorityFee(fallbackGasPrice);
  }
};

describe('Gas oracle', () => {
  const txTypes: ('legacy' | 'eip1559')[] = ['legacy', 'eip1559'];

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
      });

      it('returns latestBlockPercentileGasPrice', async () => {
        const gasPrice = await gasOracle.getGasPrice(provider, defaultGasPriceOracleOptions, constantGasPriceStrategy);

        const processedPercentileGasPrice = await processBlockData(
          blocksWithGasPrices,
          latestBlockPercentileGasPriceStrategy.percentile,
          latestBlockPercentileGasPriceStrategy.maxDeviationMultiplier,
          constantGasPriceStrategy.gasPrice as PriorityFee,
          providerRecommendedGasPriceStrategy.recommendedGasPriceMultiplier
        );

        expect(gasPrice).toEqual(processedPercentileGasPrice);
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

        const gasPrice = await gasOracle.getGasPrice(provider, gasPriceOracleOptions, constantGasPriceStrategy);
        const providerRecommendedGasPrice = await gasOracle.fetchProviderRecommendedGasPrice(
          provider,
          providerRecommendedGasPriceStrategy
        );

        expect(gasPrice).toEqual(providerRecommendedGasPrice);
      });

      it('returns providerRecommendedGasPrice if getBlockWithTransactions provider calls fail', async () => {
        const getBlockWithTransactionsSpy = jest.spyOn(
          hre.ethers.providers.StaticJsonRpcProvider.prototype,
          'getBlockWithTransactions'
        );
        getBlockWithTransactionsSpy.mockImplementation(async () => {
          throw new Error('some error');
        });

        const gasPrice = await gasOracle.getGasPrice(provider, defaultGasPriceOracleOptions, constantGasPriceStrategy);
        const providerRecommendedGasPrice = await gasOracle.fetchProviderRecommendedGasPrice(
          provider,
          providerRecommendedGasPriceStrategy
        );

        expect(gasPrice).toEqual(providerRecommendedGasPrice);
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

        const gasPrice = await gasOracle.getGasPrice(provider, defaultGasPriceOracleOptions, constantGasPriceStrategy);
        const constantGasPrice = gasOracle.fetchConstantGasPrice(constantGasPriceStrategy);

        expect(gasPrice).toEqual(constantGasPrice);
      });
    });
  });
});
