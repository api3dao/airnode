import { Convenience } from './convenience';

describe('Convenience', () => {
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

  it('exposes the contract topics', () => {
    expect(Convenience.topics).toEqual({});
  });
});
