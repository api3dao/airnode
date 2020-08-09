import { ethers } from 'ethers';
import { ClientRequest, Withdrawal } from '../../../src/types';

export function createWithdrawal(params?: Partial<ClientRequest<Withdrawal>>): ClientRequest<Withdrawal> {
  return {
    id: 'withdrawalId',
    requesterId: 'requesterId',
    destinationAddress: 'destinationAddress',
    providerId: 'providerId',
    valid: true,
    walletIndex: 123,
    walletAddress: 'walletAddress',
    walletBalance: ethers.BigNumber.from('10'),
    walletMinimumBalance: ethers.BigNumber.from('5'),
    ...params,
  };
}
