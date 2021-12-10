import { ethers } from 'ethers';
import { applyFulfillment } from './requests';
import * as fixtures from '../../../test/fixtures';
import { RequestStatus } from '../../types';

describe('applyFulfillment', () => {
  const hash = '0xtransactionId';
  const invalidData01: ethers.Transaction = {
    chainId: 31337,
    data: '0xdata',
    gasLimit: ethers.BigNumber.from(500_000),
    gasPrice: ethers.BigNumber.from(1000),
    nonce: 5,
    value: ethers.BigNumber.from(1000),
  };
  const invalidData02 = undefined as unknown as ethers.Transaction;
  const validData: ethers.Transaction = {
    ...invalidData01,
    hash,
  };

  describe('for apiCall', () => {
    const request = fixtures.requests.buildApiCall();

    it('populates request with valid transaction data', () => {
      const fulfilledRequest = applyFulfillment(request, validData);
      expect(fulfilledRequest).toEqual({
        ...request,
        fulfillment: { hash },
        status: RequestStatus.Submitted,
      });
    });

    it('returns the same request for invalid transaction data', () => {
      const unfulfilledRequest01 = applyFulfillment(request, invalidData01);
      expect(unfulfilledRequest01).toEqual(request);
      const unfulfilledRequest02 = applyFulfillment(request, invalidData02);
      expect(unfulfilledRequest02).toEqual(request);
    });
  });

  describe('for withdrawal', () => {
    const request = fixtures.requests.buildWithdrawal();

    it('populates request with valid transaction data', () => {
      const fulfilledRequest = applyFulfillment(request, validData);
      expect(fulfilledRequest).toEqual({
        ...request,
        fulfillment: { hash },
        status: RequestStatus.Submitted,
      });
    });

    it('returns the same request for invalid transaction data', () => {
      const unfulfilledRequest01 = applyFulfillment(request, invalidData01);
      expect(unfulfilledRequest01).toEqual(request);
      const unfulfilledRequest02 = applyFulfillment(request, invalidData02);
      expect(unfulfilledRequest02).toEqual(request);
    });
  });
});
