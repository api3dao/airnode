import { processTransactions } from './process-transactions';
import * as evmHandler from '../evm/handlers/process-transactions';
import * as fixtures from '../../test/fixtures';

describe('processTransactions', () => {
  test.each(['1', '2'] as const)('processes EVM providers', (txType) => {
    const processSpy = jest.spyOn(evmHandler, 'processTransactions');
    const initialState = fixtures.buildEVMProviderState();
    const chainOptions = { txType };

    const state = {
      ...initialState,
      settings: {
        ...initialState.settings,
        chainOptions,
      },
    };
    processTransactions(state);
    expect(processSpy).toHaveBeenCalledTimes(1);
    expect(processSpy).toHaveBeenCalledWith(state);
  });
});
