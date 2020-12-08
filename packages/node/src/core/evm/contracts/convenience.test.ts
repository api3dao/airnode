import { Convenience } from './convenience';

describe('Convenience', () => {
  it('exposes the addresses for each network', () => {
    expect(Convenience.addresses).toEqual({
      1: '<TODO>',
      3: '0x1Da10cDEc44538E1854791b8e71FA4Ef05b4b238',
      4: '0x452aC3e0AE3652DD887BDAbaeC5C979773fA1Ed1',
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
