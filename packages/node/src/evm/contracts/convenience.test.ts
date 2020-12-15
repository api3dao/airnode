import { Convenience } from './convenience';
import { ConvenienceAddresses } from '@airnode/protocol';

describe('Convenience', () => {
  it('exposes the addresses for each network', () => {
    expect(Convenience.addresses).toEqual({
      1: '<TODO>',
      3: ConvenienceAddresses[3],
      4: ConvenienceAddresses[4],
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
