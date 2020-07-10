import { ResponseParameters } from '../types';
import * as proccessor from './index';

describe('isNumberType', () => {
  it('checks if the value is int256', () => {
    expect(proccessor.isNumberType('int256')).toEqual(true);
    expect(proccessor.isNumberType('bool')).toEqual(false);
    expect(proccessor.isNumberType('bytes32')).toEqual(false);
  });
});

describe('extractResponse', () => {
  it('returns simple strings without a path', () => {
    const res = proccessor.extractResponse('somestring', { type: 'bytes32' });
    expect(res).toEqual('somestring');
  });

  it('returns simple numbers without a path', () => {
    const res = proccessor.extractResponse(777.77, { type: 'int256', times: 100 });
    expect(res).toEqual(77777);
  });

  it('extracts the value from the path from complex objects', () => {
    const data = { a: { b: [{ c: 1 }, { d: 5 }] } };
    const parameters: ResponseParameters = { path: 'a.b.1.d', type: 'bytes32' };
    const res = proccessor.extractResponse(data, parameters);
    expect(res).toEqual('5');
  });

  it('multiplies number values by the times', () => {
    const data = { a: [{ c: 1 }, { d: [5.5, 4.4, 6.6, 7.789] }] };
    const parameters: ResponseParameters = { path: 'a.1.d.3', type: 'int256', times: 1000 };
    const res = proccessor.extractResponse(data, parameters);
    expect(res).toEqual(7789);
  });

  it('throws an error if unable to find the value from the path', () => {
    const data = { a: 1 };
    const parameters: ResponseParameters = { path: 'b', type: 'int256', times: 1000 };
    expect(() => {
      proccessor.extractResponse(data, parameters);
    }).toThrowError(new Error("Unable to find value from path: 'b'"));
  });
});
