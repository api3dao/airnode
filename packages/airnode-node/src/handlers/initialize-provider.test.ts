import { ethers } from 'ethers';
import { initializeProvider } from './initialize-provider';
import * as evmHandler from '../evm/handlers/initialize-provider';
import * as fixtures from '../../test/fixtures';

describe('initializeProvider', () => {
  jest.setTimeout(30_000);
  fixtures.setEnvVariables({ AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey() });

  it('initializes EVM providers', async () => {
    const getBlockNumberSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBlockNumber');
    const currentBlockNumber = 18;
    getBlockNumberSpy.mockResolvedValueOnce(currentBlockNumber);

    const initializeSpy = jest.spyOn(evmHandler, 'initializeProvider');
    const state = fixtures.buildEVMProviderState();
    await initializeProvider(state);
    expect(initializeSpy).toHaveBeenCalledTimes(1);
    expect(initializeSpy).toHaveBeenCalledWith(state);
  });
});
