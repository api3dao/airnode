import { ethers } from 'ethers';
import { buildEVMProvider } from './evm-provider';

describe('buildEVMProvider', () => {
  it('returns a new JsonRpcProvider instance', () => {
    const provider = buildEVMProvider('https://some.provider', '3');
    expect(provider).toBeInstanceOf(ethers.providers.JsonRpcProvider);
  });
});
