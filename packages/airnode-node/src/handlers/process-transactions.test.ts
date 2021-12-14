import { processTransactions } from './process-transactions';
import * as evmHandler from '../evm/handlers/process-transactions';
import * as fixtures from '../../test/fixtures';
import { ChainOptions } from '../types';

describe('processTransactions', () => {
  test.each(['1', '2'])('processes EVM providers', (txType: string) => {
    const processSpy = jest.spyOn(evmHandler, 'processTransactions');
    const initialState = fixtures.buildEVMProviderState();
    const chainOptions = { txType } as ChainOptions;

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
