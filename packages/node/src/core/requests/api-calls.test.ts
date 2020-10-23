import * as fixtures from 'test/fixtures';
import * as apiCalls from './api-calls';
import { WalletDataByIndex } from 'src/types';

describe('flatten (API calls)', () => {
  it('flattens the requests across all wallets', () => {
    const call1 = fixtures.requests.createApiCall({ id: '0x1' });
    const call2 = fixtures.requests.createApiCall({ id: '0x2' });
    const walletDataByIndex: WalletDataByIndex = {
      3: {
        address: '0xaddress1',
        requests: {
          apiCalls: [call1],
          withdrawals: [],
        },
        transactionCount: 5,
      },
      4: {
        address: '0xaddress2',
        requests: {
          apiCalls: [call2],
          withdrawals: [],
        },
        transactionCount: 5,
      },
    };
    const res = apiCalls.flatten(walletDataByIndex);
    expect(res).toEqual([call1, call2]);
  });
});
