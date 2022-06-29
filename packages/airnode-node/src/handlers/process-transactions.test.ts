import { processTransactions } from './process-transactions';
import * as evmHandler from '../evm/handlers/process-transactions';
import * as fixtures from '../../test/fixtures';

describe('processTransactions', () => {
  const OLD_ENV = process.env;

  beforeAll(() => {
    jest.resetModules();
    process.env = {
      ...OLD_ENV,
      AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey(),
    };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test.each(['legacy', 'eip1559'] as const)('processes EVM providers - txType: %s', async (txType) => {
    const processSpy = jest.spyOn(evmHandler, 'processTransactions');
    const initialState = fixtures.buildEVMProviderSponsorState();
    const chainOptions = { txType, fulfillmentGasLimit: 500_000 };

    const state = {
      ...initialState,
      settings: {
        ...initialState.settings,
        chainOptions,
      },
    };
    await processTransactions(state);
    expect(processSpy).toHaveBeenCalledTimes(1);
    expect(processSpy).toHaveBeenCalledWith(state);
  });
});
