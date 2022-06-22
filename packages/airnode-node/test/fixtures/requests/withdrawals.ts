import { buildMetadata } from './metadata';
import { Request, Withdrawal } from '../../../src/types';

export function buildWithdrawal(params?: Partial<Request<Withdrawal>>): Request<Withdrawal> {
  const metadata = buildMetadata();

  // These fields have invalid values on purpose to allow for easier reading. When necessary,
  // they can be overridden with valid values
  return {
    airnodeAddress: 'airnodeAddress',
    sponsorWalletAddress: '0xdBFe14C250643DEFE92C9AbC52103bf4978C7113',
    id: 'withdrawalId',
    metadata,
    sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
    chainId: '31337',
    ...params,
  };
}
