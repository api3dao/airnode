import { createAndMockGasTarget } from '../../test/mock-utils';
import { processTransactions } from './process-transactions';
import * as evmHandler from '../evm/handlers/process-transactions';
import * as fixtures from '../../test/fixtures';

describe('processTransactions', () => {
  fixtures.setEnvVariables({ AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey() });

  test.each(['legacy', 'eip1559'] as const)('processes EVM providers - txType: %s', async (txType) => {
    createAndMockGasTarget(txType);

    const processSpy = jest.spyOn(evmHandler, 'processTransactions');
    const initialState = fixtures.buildEVMProviderSponsorState();

    const state = {
      ...initialState,
      settings: {
        ...initialState.settings,
        chainOptions: {
          ...initialState.settings.chainOptions,
          fulfillmentGasLimit: 500_000,
        },
      },
    };
    await processTransactions(state);
    expect(processSpy).toHaveBeenCalledTimes(1);
    expect(processSpy).toHaveBeenCalledWith(state);
  });
});
