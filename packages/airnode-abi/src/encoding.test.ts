import { ethers } from 'ethers';
import * as decoding from './decoding';
import * as encoding from './encoding';
import { ABIParameterType } from './types';

describe('encodeMap', () => {
  const encodingValues: { [key in ABIParameterType]: [string, string | ethers.BigNumber] } = {
    bytes: ['TestBytesName', '0x123abc'],
    bytes32: ['TestBytes32Name', 'Some bytes32 value'],
    string: ['TestStringName', 'Some string value'],
    address: ['TestAddressName', '0x4128922394C63A204Dd98ea6fbd887780b78bb7d'],
    int256: ['TestIntName', '-10000000000000000000'],
    uint256: ['TestUIntName', '20000000000000000000'],
  };

  Object.keys(encodingValues).forEach((type) => {
    it(`encodes basic ${type} values`, () => {
      const [name, value] = encodingValues[type];
      const types = [type as ABIParameterType];
      const encoded = encoding.encode(types, [name], [value]);
      const decoded = decoding.decode(encoded);
      expect(decoded).toEqual({ [name]: value });
    });
  });

  it('encodes multiple types', () => {
    const types = ['bytes32', 'address', 'string', 'int256', 'bytes', 'uint256'];
    const names = ['bytes32 name', 'wallet', 'string name', 'balance', 'bytes name', 'holders'];
    const values = [
      'bytes 32 value',
      '0x4128922394C63A204Dd98ea6fbd887780b78bb7d',
      'string value',
      '-10000000000000000000',
      '0x123abc',
      '20000000000000000000',
    ];
    const encoded = encoding.encode(types, names, values);
    const decoded = decoding.decode(encoded);
    expect(decoded).toEqual({
      'bytes32 name': 'bytes 32 value',
      'bytes name': '0x123abc',
      'string name': 'string value',
      balance: '-10000000000000000000',
      holders: '20000000000000000000',
      wallet: '0x4128922394C63A204Dd98ea6fbd887780b78bb7d',
    });
  });

  it('throws an error for unrecognised types', () => {
    expect.assertions(1);
    const types = ['int256', 'xyz'];
    const names = ['balance', 'holders'];
    const values = ['-100', '100'];
    try {
      encoding.encode(types, names, values);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
  });

  it('throws an error if a different number of types is provided', () => {
    expect.assertions(1);
    const types = ['int256'];
    const names = ['balance', 'holders'];
    const values = ['-100', '100'];
    try {
      encoding.encode(types, names, values);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
  });

  it('throws an error if a different number of names is provided', () => {
    expect.assertions(1);
    const types = ['int256', 'uint256'];
    const names = ['balance'];
    const values = ['-100', '100'];
    try {
      encoding.encode(types, names, values);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
  });

  it('throws an error if a different number of types is provided', () => {
    expect.assertions(1);
    const types = ['int256', 'uint256'];
    const names = ['balance', 'holders'];
    const values = ['-100'];
    try {
      encoding.encode(types, names, values);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
  });
});
