import { initializeProvider } from './initialize-provider';
import * as evmHandler from '../evm/handlers/initialize-provider';
import * as fixtures from '../../test/fixtures';

describe('initializeProvider', () => {
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

  it('initializes EVM providers', () => {
    const initializeSpy = jest.spyOn(evmHandler, 'initializeProvider');
    const state = fixtures.buildEVMProviderState();
    initializeProvider(state);
    expect(initializeSpy).toHaveBeenCalledTimes(1);
    expect(initializeSpy).toHaveBeenCalledWith(state);
  });
});
