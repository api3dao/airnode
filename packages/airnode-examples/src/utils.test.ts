import { setMaxPromiseTimeout, readPackageVersion, getExistingAirnodeRrpV0, supportedNetworks } from './utils';

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

describe('getExistingAirnodeRrpV0', () => {
  test.each(supportedNetworks)(`confirms AirnodeRrpV0 address is present for supported network - %s`, (name) => {
    const address = getExistingAirnodeRrpV0(name);
    expect(typeof address).toEqual('string');
  });

  it('returns the address of the named network', () => {
    const network = 'polygon';
    const address = getExistingAirnodeRrpV0(network);
    expect(address).toBe('0xa0AD79D995DdeeB18a14eAef56A549A04e3Aa1Bd');
  });
});
