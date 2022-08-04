import { getGatewaysUrl } from './server';

describe('getGatewaysUrl', () => {
  it('returns full gateway URL', () => {
    expect(getGatewaysUrl(9876, '/some-path')).toEqual('http://localhost:9876/some-path');
  });

  it('returns full gateway URL when path is specified without leading "/"', () => {
    expect(getGatewaysUrl(9876, 'some-path')).toEqual('http://localhost:9876/some-path');
  });

  it('returns the base URL', () => {
    expect(getGatewaysUrl(9876)).toEqual('http://localhost:9876');
  });

  it('returns the base URL with default port', () => {
    expect(getGatewaysUrl()).toEqual('http://localhost:3000');
  });
});
