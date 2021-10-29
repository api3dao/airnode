import * as build from './build-request';
import * as fixtures from '../../test/fixtures';

describe('buildingRequest', () => {
  it('builds and returns the request', () => {
    const options = fixtures.buildRequestOptions();
    const res = build.buildRequest(options);
    expect(res).toEqual({
      baseUrl: 'http://localhost:5000',
      data: {
        access_key: 'super-secret-key',
        amount: '1',
        from: 'ETH',
        to: 'USD',
      },
      headers: {},
      method: 'get',
      path: '/convert',
    });
  });

  it('builds and returns the request with metadata', () => {
    const options = fixtures.buildRequestOptions({
      parameters: {
        f: 'ETH',
        amount: '1',
      },
      metadataParameters: {
        _airnode_airnode_address: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
        _airnode_requester_address: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        _airnode_sponsor_wallet: '0xB604c9f7de852F26DB90C04000820850112905b4',
        _airnode_endpoint_id: '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353',
        _airnode_sponsor_address: '0x7a9a6F6B21AEE3b905AEeC757bbBcA39747Ca4Fa',
        _airnode_request_id: '0xcf2816af81f9cc7c9879dc84ce29c00fe1e290bcb8d2e4b204be1eeb120811bf',
        _airnode_chain_id: '31337',
        _airnode_chain_type: 'evm',
        _airnode_airnode_rrp: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      },
    });
    const res = build.buildRequest(options);
    expect(res).toEqual({
      baseUrl: 'http://localhost:5000',
      data: {
        access_key: 'super-secret-key',
        amount: '1',
        from: 'ETH',
        to: 'USD',
        _airnode_airnode_address: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
        _airnode_requester_address: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        _airnode_sponsor_wallet: '0xB604c9f7de852F26DB90C04000820850112905b4',
        _airnode_endpoint_id: '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353',
        _airnode_sponsor_address: '0x7a9a6F6B21AEE3b905AEeC757bbBcA39747Ca4Fa',
        _airnode_request_id: '0xcf2816af81f9cc7c9879dc84ce29c00fe1e290bcb8d2e4b204be1eeb120811bf',
        _airnode_chain_id: '31337',
        _airnode_chain_type: 'evm',
        _airnode_airnode_rrp: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      },
      headers: {},
      method: 'get',
      path: '/convert',
    });
  });

  it('throws an error if the endpoint cannot be found', () => {
    const ois = fixtures.buildOIS({ endpoints: [] });
    const options = fixtures.buildRequestOptions({ ois });
    expect(() => build.buildRequest(options)).toThrow(new Error("Endpoint: 'convertToUSD' not found in the OIS."));
  });
});
