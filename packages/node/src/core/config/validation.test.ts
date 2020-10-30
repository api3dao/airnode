import * as fixtures from 'test/fixtures';
import * as validation from './validation';
import { ChainConfig } from 'src/types';

describe('validate', () => {
  it('validates EVM configurations', () => {
    const chains: ChainConfig[] = [
      {
        adminAddress: '0xadminAddress',
        id: 1337,
        type: 'evm',
        providers: [{ name: 'ganache-local', url: 'http://localhost:4111' }],
        contracts: [{ name: 'Airnode', address: 'invalidaddress' }],
      },
    ];
    const settings = fixtures.createNodeSettings({ chains });
    expect(validation.validate(settings)).toEqual([
      'A valid EVM contract address is required for Airnode (chain ID: 1337)',
    ]);
  });

  it('throws an error for unknown chain types', () => {
    expect.assertions(1);
    const chains: any = [
      {
        adminAddress: '0xadminAddress',
        id: 1337,
        type: 'unknown',
        providers: [{ name: 'ganache-local', url: 'http://localhost:4111' }],
      },
    ];
    const settings = fixtures.createNodeSettings({ chains });
    try {
      validation.validate(settings);
    } catch (e) {
      expect(e).toEqual(new Error('Unknown chain type: unknown'));
    }
  });
});
