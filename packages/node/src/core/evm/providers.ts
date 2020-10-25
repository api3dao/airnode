import { ethers } from 'ethers';
import { Convenience } from './contracts';
import { go, retryOperation } from '../utils/promise-utils';
import * as logger from '../logger';
import { LogsData } from '../../types';

interface FetchOptions {
  address: string;
  provider: ethers.providers.JsonRpcProvider;
  providerId: string;
}

interface ProviderWithBlockNumber {
  adminAddress: string;
  blockNumber: number;
  xpub: string;
}

export async function getProviderAndBlockNumber(fetchOptions: FetchOptions): Promise<LogsData<ProviderWithBlockNumber | null>> {
  const convenience = new ethers.Contract(fetchOptions.address, Convenience.ABI, fetchOptions.provider);
  const contractCall = () => convenience.getProviderAndBlockNumber(fetchOptions.providerId);
  const retryableContractCall = retryOperation(2, contractCall, { timeouts: [4000, 4000] }) as Promise<any>;

  const fetchLog = logger.pend('INFO', 'Fetching current block and provider admin details...');

  const [err, res] = await go(retryableContractCall);
  if (err || !res) {
    const errLog = logger.pend('ERROR', 'Unable to fetch current block and provider admin details', err);
    return [[fetchLog, errLog], null];
  }

  const data: ProviderWithBlockNumber = {
    adminAddress: res.admin,
    blockNumber: res.blockNumber,
    xpub: res.xpub,
  };

  const xpubLog = logger.pend('INFO', `Admin extended public key: ${res.xpub}`);
  const addressLog = logger.pend('INFO', `Admin address: ${res.admin}`);
  const blockLog = logger.pend('INFO', `Current block set to: ${res.blockNumber}`);

  const logs = [fetchLog, xpubLog, addressLog, blockLog];
  return [logs, data];
}

export async function create(fetchOptions: FetchOptions) {
  
}
