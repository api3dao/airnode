import { Convenience } from './convenience';

describe('Convenience', () => {
  it('exposes the addresses for each network', () => {
    const chainIds = Object.keys(Convenience.addresses).sort();
    expect(chainIds).toEqual(['1', '1337', '3']);

    // We don't care what the value of 1337 is set to
    expect.assertions(chainIds.length);

    expect(Convenience.addresses[1]).toEqual('<TODO>');
    expect(Convenience.addresses[3]).toEqual('<TODO>');
  });

  it('exposes the contract ABI function', () => {
    const functions = Convenience.ABI.filter((fn: any) => fn.type === 'function')
      .map((fn: any) => fn.name)
      .sort();

    expect(functions).toEqual([
      'checkAuthorizationStatuses',
      'endpointStore',
      'getDataWithClientAddress',
      'getDataWithClientAddresses',
      'getTemplates',
      'providerStore',
      'requesterStore',
      'templateStore',
    ]);
  });
});
