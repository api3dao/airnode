import * as decoding from './decoding';
import * as encoding from './encoding';
import { InputParameter } from './types';

describe('encode', () => {
  const inputParameters: InputParameter[] = [
    { type: 'bytes', name: 'TestBytesName', value: '0x123abc' },
    {
      type: 'bytes32',
      name: 'TestBytes32Name',
      value: '0x72616e646f6d737472696e670000000000000000000000000000000000000000',
    },
    { type: 'string', name: 'TestStringName', value: 'Some string value' },
    { type: 'string32', name: 'TestString32Name', value: 'Some string32 value' },
    { type: 'address', name: 'TestAddressName', value: '0x4128922394C63A204Dd98ea6fbd887780b78bb7d' },
    { type: 'int256', name: 'TestIntName', value: '-10000000000000000000' },
    { type: 'uint256', name: 'TestUIntName', value: '20000000000000000000' },
    { type: 'bool', name: 'TestBoolName', value: false },
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
    const parameters: InputParameter[] = [
      { type: 'string32', name: 'string32 name', value: 'string32 value' },
      { type: 'address', name: 'wallet', value: '0x4128922394C63A204Dd98ea6fbd887780b78bb7d' },
      { type: 'string', name: 'string name', value: 'string value' },
      { type: 'int256', name: 'balance', value: '-10000000000000000000' },
      { type: 'bytes', name: 'bytes name', value: '0x123abc' },
      { type: 'uint256', name: 'holders', value: '20000000000000000000' },
      { type: 'bool', name: 'boolVal', value: true },
    ];
    const encoded = encoding.encode(parameters);
    const decoded = decoding.decode(encoded);
    expect(decoded).toEqual({
      'string32 name': 'string32 value',
      'bytes name': '0x123abc',
      'string name': 'string value',
      balance: '-10000000000000000000',
      holders: '20000000000000000000',
      wallet: '0x4128922394C63A204Dd98ea6fbd887780b78bb7d',
      boolVal: true,
    });
  });

  it('throws an error for unrecognized types', () => {
    expect.assertions(1);
    const parameters = [
      { type: 'int256', name: 'balance', value: '-100' },
      { type: 'xyz', name: 'holders', value: '100' },
    ];
    expect(() => encoding.encode(parameters as any)).toThrow();
  });

  describe('encoding boolean value', () => {
    it('encodes regular JS true/false expressions', () => {
      const trueEncoded = encoding.encode([{ type: 'bool', name: 'boolValue', value: true }]);
      const falseEncoded = encoding.encode([{ type: 'bool', name: 'boolValue', value: false }]);

      expect(decoding.decode(trueEncoded)).toEqual({ boolValue: true });
      expect(decoding.decode(falseEncoded)).toEqual({ boolValue: false });
    });

    it('treats any non empty string as truthy and empty string falsy', () => {
      const emptyEncoded = encoding.encode([{ type: 'bool', name: 'boolValue', value: '' }]);
      const nonEmptyEncoded = encoding.encode([{ type: 'bool', name: 'boolValue', value: '0' }]);

      expect(decoding.decode(emptyEncoded)).toEqual({ boolValue: false });
      expect(decoding.decode(nonEmptyEncoded)).toEqual({ boolValue: true });
    });

    it('treats zero as falsy and any other number as truthy value', () => {
      const zeroEncoded = encoding.encode([{ type: 'bool', name: 'boolValue', value: 0 }]);
      const nonZeroEncoded = encoding.encode([{ type: 'bool', name: 'boolValue', value: 123 }]);

      expect(decoding.decode(zeroEncoded)).toEqual({ boolValue: false });
      expect(decoding.decode(nonZeroEncoded)).toEqual({ boolValue: true });
    });
  });
});
