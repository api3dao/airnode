import { ethers } from 'ethers';
import { BaseRequest, WalletDesignation } from '../../../src/types';

export function createWalletDesignation(
  params?: Partial<BaseRequest<WalletDesignation>>
): BaseRequest<WalletDesignation> {
  return {
    id: 'walletDesignationId',
    depositAmount: ethers.BigNumber.from('20'),
    providerId: 'providerId',
    requesterId: 'requesterId',
    walletIndex: 5,
    valid: true,
    ...params,
  };
}
