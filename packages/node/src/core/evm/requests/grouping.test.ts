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
    const walletDesignations = [
      fixtures.requests.createWalletDesignation({ id: '0x1', walletIndex: '7' }),
      fixtures.requests.createWalletDesignation({ id: '0x2', walletIndex: '8' }),
    ];
    const withdrawals = [
      fixtures.requests.createWithdrawal({ walletIndex: '9' }),
      fixtures.requests.createWithdrawal({ walletIndex: '12' }),
    ];
    const requests: GroupedRequests = {
      apiCalls: apiCalls,
      walletDesignations: walletDesignations,
      withdrawals: withdrawals,
    };

    const res = grouping.groupRequestsByWalletIndex(requests);
    expect(res).toEqual({
      0: {
        address: '0x566954B6E04BDb789e7d1118e3dC1AC9A34A8B44',
        requests: {
          apiCalls: [],
          walletDesignations: walletDesignations,
          withdrawals: [],
        },
        transactionCount: 0,
      },
      8: {
        address: '0x295f197F480D76149b789617412A19304cecF318',
        requests: {
          apiCalls: [apiCalls[0]],
          walletDesignations: [],
          withdrawals: [],
        },
        transactionCount: 0,
      },
      9: {
        address: '0x5f02faEeF1270675CA73f672EA3f78FD187Fb922',
        requests: {
          apiCalls: [apiCalls[1], apiCalls[2]],
          walletDesignations: [],
          withdrawals: [withdrawals[0]],
        },
        transactionCount: 0,
      },
      10: {
        address: '0xB00EC1870818C986133DE01C2fF4D74df928EFCF',
        requests: {
          apiCalls: [apiCalls[3]],
          walletDesignations: [],
          withdrawals: [],
        },
        transactionCount: 0,
      },
      12: {
        address: '0x76e1fe9D5a433FbC2bc0876db3F08f71D3C1d938',
        requests: {
          apiCalls: [],
          walletDesignations: [],
          withdrawals: [withdrawals[1]],
        },
        transactionCount: 0,
      },
    });
  });
});
