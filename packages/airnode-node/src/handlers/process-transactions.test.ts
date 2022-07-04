import { processTransactions } from './process-transactions';
import * as evmHandler from '../evm/handlers/process-transactions';
import * as fixtures from '../../test/fixtures';

describe('processTransactions', () => {
  fixtures.setEnvVariables({ AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey() });

  test.each(['legacy', 'eip1559'] as const)('processes EVM providers - txType: %s', async (txType) => {
    const processSpy = jest.spyOn(evmHandler, 'processTransactions');
    const initialState = fixtures.buildEVMProviderSponsorState();
    const chainOptions = {
      txType,
      fulfillmentGasLimit: 500_000,
    };

    const state = {
      ...initialState,
      settings: {
        ...initialState.settings,
        chainOptions: {
          ...initialState.settings.chainOptions,
          ...chainOptions,
          txType,
        },
      },
    };
    await processTransactions(state);
    expect(processSpy).toHaveBeenCalledTimes(1);
    expect(processSpy).toHaveBeenCalledWith(state);
  });
});
