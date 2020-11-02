import { Convenience } from './convenience';

describe('Convenience', () => {
  it('exposes the addresses for each network', () => {
    expect(Convenience.addresses).toEqual({
      1: '<TODO>',
      3: '0xd029Ec5D9184Ecd8E853dC9642bdC1E0766266A1',
      4: '0xC7CEFcf5e20EeB102527E855D0791155785EeeEE',
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
