import { buildMetadata } from './metadata';
import { Request, RequestStatus } from '../../../src/types';

export function buildWithdrawal(params?: Partial<Request<{}>>): Request<{}> {
  const metadata = buildMetadata();

  // These fields have invalid values on purpose to allow for easier reading. When necessary,
  // they can be overridden with valid values
  return {
    airnodeAddress: 'airnodeAddress',
    sponsorWalletAddress: 'sponsorWalletAddress',
    id: 'withdrawalId',
    metadata,
    sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
    status: RequestStatus.Pending,
    ...params,
  };
}
