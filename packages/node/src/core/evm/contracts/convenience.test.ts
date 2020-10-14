import { Convenience } from './convenience';

describe('Convenience', () => {
  it('exposes the addresses for each network', () => {
    expect(Convenience.addresses).toEqual({
      1: '<TODO>',
      3: '<TODO>',
      1337: '0xD5659F26A72A8D718d1955C42B3AE418edB001e0',
    });
  });

  it('exposes the contract ABI function', () => {
    const functions = Convenience.ABI.filter((fn: any) => fn.type === 'function')
      .map((fn: any) => fn.name)
      .sort();

    expect(functions).toEqual([
      'airnode',
      'checkAuthorizationStatus',
      'checkAuthorizationStatuses',
      'getProviderAndBlockNumber',
      'getTemplates',
    ]);
  });
});
