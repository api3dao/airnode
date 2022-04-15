import { unsafeEvaluate } from './unsafe-evaluate';

describe('unsafe evaluate', () => {
  it('executes harmless code', () => {
    const result = unsafeEvaluate({ a: true, b: 123 }, "const output = {...input, c: 'some-value'}");

    expect(result).toEqual({ a: true, b: 123, c: 'some-value' });
  });

  it('throws on exception', () => {
    expect(() => unsafeEvaluate({}, "throw new Error('unexpected')")).toThrow('unexpected');
  });
});
