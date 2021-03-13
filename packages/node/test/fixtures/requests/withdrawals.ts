import { ClientRequest, RequestStatus, Withdrawal } from '../../../src/types';
import { buildMetadata } from './metadata';

export function buildWithdrawal(params?: Partial<ClientRequest<Withdrawal>>): ClientRequest<Withdrawal> {
  const metadata = buildMetadata();

  // These fields have invalid values on purpose to allow for easier reading. When necessary,
  // they can be overridden with valid values
  return {
    designatedWallet: 'designatedWallet',
    destinationAddress: 'destinationAddress',
    id: 'withdrawalId',
    metadata,
    airnodeId: 'airnodeId',
    requesterIndex: '1',
    status: RequestStatus.Pending,
    ...params,
  };
}
