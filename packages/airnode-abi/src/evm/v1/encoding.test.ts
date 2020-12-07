import { ethers } from 'ethers';
import * as decoding from './decoding';
import * as encoding from './encoding';
import { ABIParameterType } from '../../types';

describe('encodeMap', () => {
  const encodingValues: { [key in ABIParameterType]: [string, string | ethers.BigNumber] } = {
    bytes: ['TestBytesName', 'Some bytes value'],
    bytes32: ['TestBytes32Name', 'Some bytes32 value'],
    string: ['TestStringName', 'Some string value'],
    address: ['TestAddressName', '0x4128922394C63A204Dd98ea6fbd887780b78bb7d'],
    int256: ['TestIntName', ethers.BigNumber.from('-1000')],
    uint256: ['TestUIntName', ethers.BigNumber.from('2000')],
  };

  Object.keys(encodingValues).forEach((type) => {
    it(`encodes basic ${type} values`, () => {
      const [name, value] = encodingValues[type];
      const types = [type as ABIParameterType];
      const encoded = encoding.encode(types, [name], [value]);
      const decoded = decoding.decodeMap(encoded);
      expect(decoded).toEqual({ [name]: value });
    });
  });

  it('encodes multiple types', () => {
    const types: ABIParameterType[] = ['bytes32', 'address', 'string', 'int256', 'bytes', 'uint256'];
    const names = ['bytes32 name', 'wallet', 'string name', 'balance', 'bytes name', 'holders'];
    const values = [
      'bytes 32 value',
      '0x4128922394C63A204Dd98ea6fbd887780b78bb7d',
      'string value',
      ethers.BigNumber.from('-100'),
      'bytes value',
      ethers.BigNumber.from('777'),
    ];
    const encoded = encoding.encode(types, names, values);
    const decoded = decoding.decodeMap(encoded);
    expect(decoded).toEqual({
      'bytes32 name': 'bytes 32 value',
      'bytes name': 'bytes value',
      'string name': 'string value',
      balance: ethers.BigNumber.from('-100'),
      holders: ethers.BigNumber.from('777'),
      wallet: '0x4128922394C63A204Dd98ea6fbd887780b78bb7d',
    });
  });

  it('encodes stringified numbers to BigNumbers', () => {
    const types: ABIParameterType[] = ['int256', 'uint256'];
    const names = ['balance', 'holders'];
    const values = ['-100', '777'];
    const encoded = encoding.encode(types, names, values);
    const decoded = decoding.decodeMap(encoded);
    expect(decoded).toEqual({
      balance: ethers.BigNumber.from('-100'),
      holders: ethers.BigNumber.from('777'),
    });
  });
});
