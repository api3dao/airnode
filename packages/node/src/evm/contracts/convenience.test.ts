import { Convenience } from './convenience';

describe('Convenience', () => {
  it('exposes the addresses for each network', () => {
    expect(Convenience.addresses).toEqual({
      1: '<TODO>',
      3: '0xa8025cA7d22825a663abdCf2a504a33c8F17C41a',
      4: '0xB5Edd78ED86b7043D212391f5A6d84cd40111be7',
      1337: '0x2393737d287c555d148012270Ce4567ABb1ee95C',
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

  it('exposes the contract topics', () => {
    expect(Convenience.topics).toEqual({});
  });
});
