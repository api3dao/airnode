import shuffle from 'lodash/shuffle';
import * as nonces from './nonces';
import * as fixtures from '../../test/fixtures';
import * as providerState from '../providers/state';
import { EVMProviderSponsorState, GroupedRequests, ProviderState } from '../types';

describe('assign', () => {
  let mutableInitialState: ProviderState<EVMProviderSponsorState>;
  fixtures.setEnvVariables({ AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey() });

  beforeEach(() => {
    mutableInitialState = fixtures.buildEVMProviderSponsorState();
  });

  it('sorts and assigns nonces requests API calls', () => {
    const firstMeta = fixtures.requests.buildMetadata({ blockNumber: 100, transactionHash: '0xa', logIndex: 0 });
    const secondMeta = fixtures.requests.buildMetadata({ blockNumber: 101, transactionHash: '0xb', logIndex: 1 });
    const thirdMeta = fixtures.requests.buildMetadata({ blockNumber: 101, transactionHash: '0xc', logIndex: 2 });

    const sponsorAddress = '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181';
    const first = fixtures.requests.buildApiCall({
      id: '0x1',
      nonce: undefined,
      metadata: firstMeta,
      sponsorAddress,
    });
    const second = fixtures.requests.buildApiCall({
      id: '0x2',
      nonce: undefined,
      metadata: secondMeta,
      sponsorAddress,
    });
    const third = fixtures.requests.buildApiCall({
      id: '0x3',
      nonce: undefined,
      metadata: thirdMeta,
      sponsorAddress,
    });

    const requests: GroupedRequests = {
      apiCalls: shuffle([third, second, first]),
      withdrawals: [],
    };
    const transactionCountsBySponsorAddress: { readonly [sponsorAddress: string]: number } = {
      [sponsorAddress]: 3,
    };
    const state = providerState.update(mutableInitialState, {
      requests,
      transactionCountsBySponsorAddress,
      sponsorAddress,
    });
    const res = nonces.assign(state);
    expect(res.apiCalls[0]).toEqual({ ...first, nonce: 3 });
    expect(res.apiCalls[1]).toEqual({ ...second, nonce: 4 });
    expect(res.apiCalls[2]).toEqual({ ...third, nonce: 5 });
  });

  it('sorts and assigns nonces requests withdrawals', () => {
    const firstMeta = fixtures.requests.buildMetadata({ blockNumber: 100, transactionHash: '0xa', logIndex: 0 });
    const secondMeta = fixtures.requests.buildMetadata({ blockNumber: 101, transactionHash: '0xb', logIndex: 1 });
    const thirdMeta = fixtures.requests.buildMetadata({ blockNumber: 101, transactionHash: '0xc', logIndex: 2 });

    const sponsorAddress = '0x1d822613f7cC57Be9c9b6C3cC0Bf41b4FB4D97f9';
    const first = fixtures.requests.buildWithdrawal({
      id: '0x1',
      nonce: undefined,
      metadata: firstMeta,
      sponsorAddress,
    });
    const second = fixtures.requests.buildWithdrawal({
      id: '0x2',
      nonce: undefined,
      metadata: secondMeta,
      sponsorAddress,
    });
    const third = fixtures.requests.buildWithdrawal({
      id: '0x3',
      nonce: undefined,
      metadata: thirdMeta,
      sponsorAddress,
    });

    const requests: GroupedRequests = {
      apiCalls: [],
      withdrawals: shuffle([first, third, second]),
    };
    const transactionCountsBySponsorAddress: { readonly [sponsorAddress: string]: number } = { [sponsorAddress]: 11 };
    const state = providerState.update(mutableInitialState, {
      requests,
      transactionCountsBySponsorAddress,
      sponsorAddress,
    });
    const res = nonces.assign(state);
    expect(res.withdrawals[0]).toEqual({ ...first, nonce: 11 });
    expect(res.withdrawals[1]).toEqual({ ...second, nonce: 12 });
    expect(res.withdrawals[2]).toEqual({ ...third, nonce: 13 });
  });
});
