import { ethers } from 'ethers';
import { applyTransactionResult } from './requests';
import * as fixtures from '../../../test/fixtures';

describe('applyTransactionResult', () => {
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
      const fulfilledRequest = applyTransactionResult(request, validData);
      expect(fulfilledRequest).toEqual({
        ...request,
        fulfillment: { hash },
      });
    });

    it('returns the same request for invalid transaction data', () => {
      const unfulfilledRequest01 = applyTransactionResult(request, invalidData01);
      expect(unfulfilledRequest01).toEqual(request);
      const unfulfilledRequest02 = applyTransactionResult(request, invalidData02);
      expect(unfulfilledRequest02).toEqual(request);
    });
  });

  describe('for withdrawal', () => {
    const request = fixtures.requests.buildWithdrawal();

    it('populates request with valid transaction data', () => {
      const fulfilledRequest = applyTransactionResult(request, validData);
      expect(fulfilledRequest).toEqual({
        ...request,
        fulfillment: { hash },
      });
    });

    it('returns the same request for invalid transaction data', () => {
      const unfulfilledRequest01 = applyTransactionResult(request, invalidData01);
      expect(unfulfilledRequest01).toEqual(request);
      const unfulfilledRequest02 = applyTransactionResult(request, invalidData02);
      expect(unfulfilledRequest02).toEqual(request);
    });
  });
});
