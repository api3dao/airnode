import { ResponseParameters } from '../types';
import * as proccessor from './index';

describe('isNumberType', () => {
  it('checks if the value is int256', () => {
    expect(proccessor.isNumberType('int256')).toEqual(true);
    expect(proccessor.isNumberType('bool')).toEqual(false);
    expect(proccessor.isNumberType('bytes32')).toEqual(false);
  });
});

describe('processor - extractResponse', () => {
  it('returns the data as is if no path is provided', () => {
    const res = proccessor.extractResponse('simplestring');
    expect(res).toEqual('simplestring');
  });

  it('extracts the value from the path from complex objects', () => {
    const data = { a: { b: [{ c: 1 }, { d: 5 }] } };
    const res = proccessor.extractResponse(data, 'a.b.1.d');
    expect(res).toEqual(5);
  });

  it('throws an error if unable to find the value from the path', () => {
    expect(() => {
      proccessor.extractResponse({ a: 1 }, 'b');
    }).toThrowError(new Error("Unable to find value from path: 'b'"));
  });
});

describe('processor - castResponse', () => {
  it('casts simple strings', () => {
    const res = proccessor.castResponse('somestring', { type: 'bytes32' });
    expect(res).toEqual('somestring');
  });

  it('casts simple numbers', () => {
    const res = proccessor.castResponse(777.77, { type: 'int256', times: 100 });
    expect(res).toEqual(77777);
  });

  it('multiplies number values by the times', () => {
    const parameters: ResponseParameters = { type: 'int256', times: 1000 };
    const res = proccessor.castResponse(7.789, parameters);
    expect(res).toEqual(7789);
  });
});
