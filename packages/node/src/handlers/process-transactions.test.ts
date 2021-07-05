import { processTransactions } from './process-transactions';
import * as evmHandler from '../evm/handlers/process-transactions';
import * as fixtures from '../../test/fixtures';

describe('processTransactions', () => {
  it('processes EVM providers', () => {
    const processSpy = jest.spyOn(evmHandler, 'processTransactions');
    const state = fixtures.buildEVMProviderState();
    processTransactions(state);
    expect(processSpy).toHaveBeenCalledTimes(1);
    expect(processSpy).toHaveBeenCalledWith(state);
  });
});
