import * as validation from './validation';
import { CoordinatorOptions } from 'src/types';

describe('validate', () => {
  it('returns no messages when no options are provided', () => {
    expect(validation.validate()).toEqual([]);
  });

  it('returns no messages when no chain configurations are provided', () => {
    expect(validation.validate({})).toEqual([]);
  });

  it('validates EVM configurations', () => {
    const options: CoordinatorOptions = {
      chains: [
        {
          id: 1337,
          type: 'evm',
          providers: [{ name: 'ganache-local', url: 'http://localhost:4111' }],
          contracts: [{ name: 'Airnode', address: 'invalidaddress' }],
        },
      ],
    };
    expect(validation.validate(options)).toEqual([
      'A valid EVM contract address is required for Airnode (chain ID: 1337)',
    ]);
  });

  it('throws an error for unknown chain types', () => {
    expect.assertions(1);
    const options: any = {
      chains: [
        {
          id: 1337,
          type: 'unknown',
          providers: [{ name: 'ganache-local', url: 'http://localhost:4111' }],
        },
      ],
    };
    try {
      validation.validate(options);
    } catch (e) {
      expect(e).toEqual(new Error('Unknown chain type: unknown'));
    }
  });
});
