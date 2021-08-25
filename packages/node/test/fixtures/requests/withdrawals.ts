import { buildMetadata } from './metadata';
import { ClientRequest, RequestStatus, Withdrawal } from '../../../src/types';

export function buildWithdrawal(params?: Partial<ClientRequest<Withdrawal>>): ClientRequest<Withdrawal> {
  const metadata = buildMetadata();

  // These fields have invalid values on purpose to allow for easier reading. When necessary,
  // they can be overridden with valid values
  return {
    airnodeAddress: 'airnodeAddress',
    sponsorWallet: 'sponsorWallet',
    id: 'withdrawalId',
    metadata,
    sponsorAddress: '1', //TODO: fix value
    status: RequestStatus.Pending,
    ...params,
  };
}
