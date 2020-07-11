import * as proccessor from './index';

describe('isNumberType', () => {
  it('checks if the value is int256', () => {
    expect(proccessor.isNumberType('int256')).toEqual(true);
    expect(proccessor.isNumberType('bool')).toEqual(false);
    expect(proccessor.isNumberType('bytes32')).toEqual(false);
  });
});

describe('extractResponse', () => {
  it('returns the data as is if no path is provided', () => {
    const res = proccessor.extractResponseValue('simplestring');
    expect(res).toEqual('simplestring');
  });

  it('extracts the value from the path from complex objects', () => {
    const data = { a: { b: [{ c: 1 }, { d: 5 }] } };
    const res = proccessor.extractResponseValue(data, 'a.b.1.d');
    expect(res).toEqual(5);
  });

  it('throws an error if unable to find the value from the path', () => {
    expect(() => {
      proccessor.extractResponseValue({ a: 1 }, 'b');
    }).toThrowError(new Error("Unable to find value from path: 'b'"));
  });
});

describe('castValue', () => {
  it('casts simple strings', () => {
    const res = proccessor.castValue('somestring', 'bytes32');
    expect(res).toEqual('somestring');
  });

  it('casts simple numbers', () => {
    const res = proccessor.castValue('777.77', 'int256');
    expect(res).toEqual(777.77);
  });

  it('casts booleans', () => {
    const res = proccessor.castValue('true', 'bool');
    expect(res).toEqual(true);
  });
});

describe('multiplyValue', () => {
  it('multiplies number values by the times', () => {
    const res = proccessor.multiplyValue(7.789, 1000);
    expect(res).toEqual(7789);
  });

  it('does nothing if times is not provided', () => {
    const res = proccessor.multiplyValue(1234);
    expect(res).toEqual(1234);
  });
});

describe('encodeValue', () => {
  it('encodes numbers', () => {
    const res = proccessor.encodeValue(777, 'int256');
    expect(res).toEqual('0x0000000000000000000000000000000000000000000000000000000000000309');
  });

  it('encodes booleans', () => {
    const res = proccessor.encodeValue(true, 'bool');
    expect(res).toEqual('0x0000000000000000000000000000000000000000000000000000000000000001');
  });

  it('encodes string', () => {
    const res = proccessor.encodeValue('random string', 'bytes32');
    expect(res).toEqual('0x72616e646f6d20737472696e6700000000000000000000000000000000000000');
  });
});
