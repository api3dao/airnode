import * as contracts from './index';
import { ChainConfig } from 'src/types';

describe('EVM_PROTECTED_CHAIN_IDS', () => {
  it('returns the list of protected EVM chain IDs', () => {
    expect(contracts.EVM_PROTECTED_CHAIN_IDS).toEqual([1]);
  });
});

describe('EVM_REQUIRED_CONTRACTS', () => {
  it('returns the list of protected EVM chain IDs', () => {
    expect(contracts.EVM_REQUIRED_CONTRACTS).toEqual(['Airnode', 'Convenience', 'GasPriceFeed']);
  });
});

describe('build', () => {
  it('returns the default addresses if no contracts are provided', () => {
    const chain: ChainConfig = {
      id: 1,
      type: 'evm',
      providers: [{ name: 'ganache-local', url: 'http://localhost:4111' }],
    };
    expect(contracts.build(chain)).toEqual({
      Airnode: '<TODO>',
      Convenience: '<TODO>',
      GasPriceFeed: '<TODO>',
    });
  });

  it('allows overridding contracts for unprotected chain IDs', () => {
    const chain: ChainConfig = {
      id: 3,
      type: 'evm',
      providers: [{ name: 'ganache-local', url: 'http://localhost:4111' }],
      contracts: [
        { name: 'Airnode', address: '0x12345' },
        { name: 'GasPriceFeed', address: '0x98765' },
      ],
    };
    expect(contracts.build(chain)).toEqual({
      Airnode: '0x12345',
      Convenience: '<TODO>',
      GasPriceFeed: '0x98765',
    });
  });

  it('throws an error when trying to override contracts for protected chain IDs', () => {
    expect.assertions(1);
    const chain: ChainConfig = {
      id: 1,
      type: 'evm',
      providers: [{ name: 'ganache-local', url: 'http://localhost:4111' }],
      contracts: [{ name: 'Airnode', address: '0x12345' }],
    };
    try {
      contracts.build(chain);
    } catch (e) {
      expect(e).toEqual(new Error('EVM Contract:Airnode cannot be overridden for protected chain ID: 1'));
    }
  });
});

describe('validate', () => {
  it('returns no messages if no contracts are provided', () => {
    const chain: ChainConfig = {
      id: 1,
      type: 'evm',
      providers: [{ name: 'ganache-local', url: 'http://localhost:4111' }],
    };
    expect(contracts.validate(chain)).toEqual([]);
  });

  it('returns no messages if valid contracts are provided', () => {
    const chain: ChainConfig = {
      id: 1337,
      type: 'evm',
      providers: [{ name: 'ganache-local', url: 'http://localhost:4111' }],
      contracts: [{ name: 'Airnode', address: '0x12345' }],
    };
    expect(contracts.validate(chain)).toEqual([]);
  });

  it('does not allow overridding contracts for protected chain IDs', () => {
    const chain: ChainConfig = {
      id: 1,
      type: 'evm',
      providers: [{ name: 'ganache-local', url: 'http://localhost:4111' }],
      contracts: [{ name: 'Airnode', address: '0x12345' }],
    };
    expect(contracts.validate(chain)).toEqual(['Contracts cannot be specified for protected chain ID: 1']);
  });

  it('checks contract addresses start with 0x', () => {
    const chain: ChainConfig = {
      id: 1337,
      type: 'evm',
      providers: [{ name: 'ganache-local', url: 'http://localhost:4111' }],
      contracts: [
        { name: 'Airnode', address: 'invalidaddress' },
        { name: 'Convenience', address: 'invalidaddress' },
      ],
    };
    expect(contracts.validate(chain)).toEqual([
      'A valid EVM contract address is required for Airnode (chain ID: 1337)',
      'A valid EVM contract address is required for Convenience (chain ID: 1337)',
    ]);
  });
});
