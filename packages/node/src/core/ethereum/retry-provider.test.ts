import { ethers } from 'ethers';
import { RetryProvider } from './retry-provider';

describe('perform', () => {
  beforeEach(() => {
    const networkSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getNetwork');
    networkSpy.mockResolvedValueOnce({ chainId: 1337, name: 'unknown' });
  });

  it('succeeds if the first call is successful', async () => {
    const spy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'perform');
    spy.mockResolvedValueOnce(20_000);

    const provider = new RetryProvider('https://some.provider');

    const res = await provider.getGasPrice();
    expect(res.toString()).toEqual('20000');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('retries if the the first call fails', async () => {
    const spy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'perform');
    spy.mockRejectedValueOnce(new Error('Failed'));
    spy.mockResolvedValueOnce(10_000);

    const provider = new RetryProvider('https://some.provider');

    const res = await provider.getGasPrice();
    expect(res.toString()).toEqual('10000');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('rejects if the call fails twice', async () => {
    expect.assertions(2);

    const spy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'perform');
    spy.mockRejectedValueOnce(new Error('First call failed'));
    spy.mockRejectedValueOnce(new Error('Second call failed'));

    const provider = new RetryProvider('https://some.provider');
    try {
      await provider.getGasPrice();
    } catch (e) {
      expect(e).toEqual(new Error('Second call failed'));
    }
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
