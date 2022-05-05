import { unsafeEvaluate, unsafeEvaluateAsync } from './unsafe-evaluate';

describe('unsafe evaluate - sync', () => {
  it('executes harmless code', () => {
    const result = unsafeEvaluate({ a: true, b: 123 }, "const output = {...input, c: 'some-value'}", 5_000);

    expect(result).toEqual({ a: true, b: 123, c: 'some-value' });
  });

  it('throws on exception', () => {
    expect(() => unsafeEvaluate({}, "throw new Error('unexpected')", 5_000)).toThrow('unexpected');
  });
});

describe('unsafe evaluate - async', () => {
  it('executes harmless code', async () => {
    const result = unsafeEvaluateAsync(
      { a: true, b: 123 },
      "const output = {...input, c: 'some-value'}; resolve(output);",
      5_000
    );

    await expect(result).resolves.toEqual({ a: true, b: 123, c: 'some-value' });
  });

  it('throws on exception', async () => {
    await expect(() => unsafeEvaluateAsync({}, "throw new Error('unexpected')", 5_000)).rejects.toEqual(
      new Error('unexpected')
    );
  });
});
