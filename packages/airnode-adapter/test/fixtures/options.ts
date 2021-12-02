import { buildOIS } from './ois';
import { buildCredentials } from './security';
import { BuildRequestOptions, CachedBuildRequestOptions } from '../../src/types';

export function buildRequestOptions(overrides?: Partial<BuildRequestOptions>): BuildRequestOptions {
  const ois = buildOIS();

  return {
    ois,
    endpointName: 'convertToUSD',
    parameters: { f: 'ETH', amount: '1' },
    apiCredentials: buildCredentials(),
    metadata: {
      airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
      requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      sponsorWalletAddress: '0xB604c9f7de852F26DB90C04000820850112905b4',
      endpointId: '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353',
      sponsorAddress: '0x7a9a6F6B21AEE3b905AEeC757bbBcA39747Ca4Fa',
      requestId: '0xcf2816af81f9cc7c9879dc84ce29c00fe1e290bcb8d2e4b204be1eeb120811bf',
      chainId: '31337',
      chainType: 'evm',
      airnodeRrpAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    },
    ...overrides,
  };
}

export function buildCacheRequestOptions(overrides?: Partial<CachedBuildRequestOptions>): CachedBuildRequestOptions {
  const options = buildRequestOptions();
  const endpoint = options.ois.endpoints[0];
  const { method, path } = endpoint.operation;
  const operation = options.ois.apiSpecifications.paths[path][method];
  return {
    ...options,
    endpoint,
    operation,
    ...overrides,
  };
}
