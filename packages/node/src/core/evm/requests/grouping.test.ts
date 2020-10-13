jest.mock('../../config', () => ({
  security: {
    masterKeyMnemonic: 'achieve climb couple wait accident symbol spy blouse reduce foil echo label',
  },
}));

import { GroupedRequests } from 'src/types';
import * as fixtures from 'test/fixtures';
import * as grouping from './grouping';

describe('groupRequestsByWalletIndex', () => {
  it('groups all requests by wallet index', () => {
    const apiCalls = [
      fixtures.requests.createApiCall({ walletIndex: '8' }),
      fixtures.requests.createApiCall({ walletIndex: '9' }),
      fixtures.requests.createApiCall({ walletIndex: '9' }),
      fixtures.requests.createApiCall({ walletIndex: '10' }),
    ];
    const withdrawals = [
      fixtures.requests.createWithdrawal({ walletIndex: '9' }),
      fixtures.requests.createWithdrawal({ walletIndex: '12' }),
    ];
    const requests: GroupedRequests = {
      apiCalls: apiCalls,
      withdrawals: withdrawals,
    };

    const res = grouping.groupRequestsByWalletIndex(requests);
    expect(res).toEqual({
      8: {
        address: '0x295f197F480D76149b789617412A19304cecF318',
        requests: {
          apiCalls: [apiCalls[0]],
          withdrawals: [],
        },
        transactionCount: 0,
      },
      9: {
        address: '0x5f02faEeF1270675CA73f672EA3f78FD187Fb922',
        requests: {
          apiCalls: [apiCalls[1], apiCalls[2]],
          withdrawals: [withdrawals[0]],
        },
        transactionCount: 0,
      },
      10: {
        address: '0xB00EC1870818C986133DE01C2fF4D74df928EFCF',
        requests: {
          apiCalls: [apiCalls[3]],
          withdrawals: [],
        },
        transactionCount: 0,
      },
      12: {
        address: '0x76e1fe9D5a433FbC2bc0876db3F08f71D3C1d938',
        requests: {
          apiCalls: [],
          withdrawals: [withdrawals[1]],
        },
        transactionCount: 0,
      },
    });
  });
});
