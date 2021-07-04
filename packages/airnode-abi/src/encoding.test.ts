/* eslint-disable functional/no-try-statement */

import * as decoding from './decoding';
import * as encoding from './encoding';
import { InputParameter } from './types';

describe('encode', () => {
  const inputParameters: InputParameter[] = [
    { type: 'bytes', name: 'TestBytesName', value: '0x123abc' },
    { type: 'bytes32', name: 'TestBytes32Name', value: 'Some bytes32 value' },
    { type: 'string', name: 'TestStringName', value: 'Some string value' },
    { type: 'address', name: 'TestAddressName', value: '0x4128922394C63A204Dd98ea6fbd887780b78bb7d' },
    { type: 'int256', name: 'TestIntName', value: '-10000000000000000000' },
    { type: 'uint256', name: 'TestUIntName', value: '20000000000000000000' },
  ];

  inputParameters.forEach((parameter) => {
    const { type, name, value } = parameter;
    it(`encodes basic ${type} values`, () => {
      const encoded = encoding.encode([parameter]);
      const decoded = decoding.decode(encoded);
      expect(decoded).toEqual({ [name]: value });
    });
  });

  it('encodes empty parameters', () => {
    const encoded = encoding.encode([]);
    expect(encoded).toEqual('0x3100000000000000000000000000000000000000000000000000000000000000');
  });

  it('encodes multiple types', () => {
    const parameters = [
      { type: 'bytes32', name: 'bytes32 name', value: 'bytes 32 value' },
      { type: 'address', name: 'wallet', value: '0x4128922394C63A204Dd98ea6fbd887780b78bb7d' },
      { type: 'string', name: 'string name', value: 'string value' },
      { type: 'int256', name: 'balance', value: '-10000000000000000000' },
      { type: 'bytes', name: 'bytes name', value: '0x123abc' },
      { type: 'uint256', name: 'holders', value: '20000000000000000000' },
    ];
    const encoded = encoding.encode(parameters);
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
    const parameters = [
      { type: 'int256', name: 'balance', value: '-100' },
      { type: 'xyz', name: 'holders', value: '100' },
    ];
    try {
      encoding.encode(parameters);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
  });
});
