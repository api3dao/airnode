import * as decoding from './decoding';
import * as encoding from './encoding';
import { ABIParameterType } from '../../types';

describe('encodeMap', () => {
  const encodingValues: { [key in ABIParameterType]: [string, string | number] } = {
    bytes: ['TestBytesName', 'Some bytes value'],
    bytes32: ['TestBytes32Name', 'Some bytes32 value'],
    string: ['TestStringName', 'Some string value'],
    address: ['TestAddressName', '0x4128922394c63a204dd98ea6fbd887780b78bb7d'],
    int256: ['TestIntName', -1000],
    uint256: ['TestUIntName', 1000],
  };

  Object.keys(encodingValues).forEach((type) => {
    it(`encodes basic ${type} values`, () => {
      const [name, value] = encodingValues[type];
      const types= [type as ABIParameterType];
      const encoded = encoding.encode(types, [name], [value]);
      const decoded = decoding.decodeMap(encoded);
      expect(decoded).toEqual({ [name]: value });
    });
  });
});
