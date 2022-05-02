import { setMaxPromiseTimeout, readPackageVersion } from './utils';

describe('setMaxPromiseTimeout', () => {
  it('returns the fulfilled promise if resolved before timeout', async () => {
    const res = await setMaxPromiseTimeout(new Promise((res) => setTimeout(() => res('success!'), 20)), 100);
    expect(res).toBe('success!');
  });

  it('rejects if the timeout is exceeded', async () => {
    await expect(
      setMaxPromiseTimeout(new Promise((res) => setTimeout(() => res('success!'), 100)), 20)
    ).rejects.toEqual('Timeout exceeded!');
  });
});

describe('readPackageVersion', () => {
  it('returns the package version from a package.json test file', () => {
    const res = readPackageVersion('../test/test-package.json');
    expect(res).toBe('0.5.0');
  });
});
