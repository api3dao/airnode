import { buildMetadata } from './metadata';
import { Request, RequestStatus, Withdrawal } from '../../../src/types';

export function buildWithdrawal(params?: Partial<Request<Withdrawal>>): Request<Withdrawal> {
  const metadata = buildMetadata();

  // These fields have invalid values on purpose to allow for easier reading. When necessary,
  // they can be overridden with valid values
  return {
    airnodeAddress: 'airnodeAddress',
    sponsorWalletAddress: '0x15c2D488bE806Ee769078Cceec00E57a9f2009E1',
    id: 'withdrawalId',
    metadata,
    sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
    status: RequestStatus.Pending,
    ...params,
  };
}
