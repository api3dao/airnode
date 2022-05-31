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

  it('can use setTimeout and setInterval', async () => {
    const result = unsafeEvaluateAsync(
      [],
      `
      const fn = async () => {
        const output = input;
        output.push('start')

        const tickMs = 30
        const bufferMs = 20
        setInterval(() => output.push('ping interval'), tickMs)
        await new Promise((res) => setTimeout(res, tickMs * 4 + bufferMs));

        output.push('end')
        resolve(output);
      };

      fn()
      `,
      200
    );

    await expect(result).resolves.toEqual([
      'start',
      'ping interval',
      'ping interval',
      'ping interval',
      'ping interval',
      'end',
    ]);
  });

  it('applies timeout when using setTimeout', async () => {
    await expect(() =>
      unsafeEvaluateAsync(
        {},
        `
        const fn = () => {
          setTimeout(() => console.log('ping timeout'), 100)
        };

        fn()
        `,
        50
      )
    ).rejects.toEqual(new Error('Timeout exceeded'));
  });

  it('applies timeout when using setInterval', async () => {
    await expect(() =>
      unsafeEvaluateAsync(
        {},
        `
        const fn = () => {
          const someFn = () => {}
          setInterval(someFn, 10)
        };

        fn()
        `,
        50
      )
    ).rejects.toEqual(new Error('Timeout exceeded'));
  });

  it('processing can call reject', async () => {
    await expect(() =>
      unsafeEvaluateAsync({}, `reject(new Error('Rejected by processing snippet.'))`, 50)
    ).rejects.toEqual(new Error('Rejected by processing snippet.'));
  });

  it('throws on exception', async () => {
    await expect(() => unsafeEvaluateAsync({}, "throw new Error('unexpected')", 5_000)).rejects.toEqual(
      new Error('unexpected')
    );
  });
});
