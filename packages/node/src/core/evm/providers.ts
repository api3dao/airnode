import { ethers } from 'ethers';
import { Airnode, Convenience } from './contracts';
import { go, retryOperation } from '../utils/promise-utils';
import * as logger from '../logger';
import * as wallet from './wallet';
import { LogsData } from '../../types';

interface BaseFetchOptions {
  airnodeAddress: string;
  convenienceAddress: string;
  provider: ethers.providers.JsonRpcProvider;
}

interface FindOptions extends BaseFetchOptions {
  providerId: string;
}

interface CreateOptions extends BaseFetchOptions {
  adminAddress: string;
  airnodeAddress: string;
  provider: ethers.providers.JsonRpcProvider;
  xpub: string;
}

interface ProviderWithBlockNumber {
  adminAddress: string;
  blockNumber: number;
  xpub: string;
}

export async function getProviderAndBlockNumber(
  fetchOptions: FindOptions
): Promise<LogsData<ProviderWithBlockNumber | null>> {
  const convenience = new ethers.Contract(fetchOptions.convenienceAddress, Convenience.ABI, fetchOptions.provider);
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
    // Converting this BigNumber to a JS number should not throw as the current block number
    // should always be a valid number
    blockNumber: res.blockNumber.toNumber(),
    xpub: res.xpub,
  };

  const addressLog = logger.pend('INFO', `Admin address: ${res.admin}`);
  const xpubLog = logger.pend('INFO', `Admin extended public key: ${res.xpub}`);
  const blockLog = logger.pend('INFO', `Current block: ${res.blockNumber}`);

  const logs = [fetchLog, addressLog, xpubLog, blockLog];
  return [logs, data];
}

export async function create(options: CreateOptions): Promise<LogsData<ethers.Transaction | null>> {
  const airnode = new ethers.Contract(options.airnodeAddress, Airnode.ABI, options.provider);
  const contractCall = () => airnode.createProvider(options.adminAddress, options.xpub);
  const retryableContractCall = retryOperation(2, contractCall, { timeouts: [4000, 4000] }) as Promise<any>;

  const createLog = logger.pend('INFO', `Creating provider with address:${options.adminAddress}...`);

  const [err, tx] = await go(retryableContractCall);
  if (err || !tx) {
    const errLog = logger.pend('ERROR', 'Unable to create provider', err);
    return [[createLog, errLog], null];
  }

  const txLog = logger.pend('INFO', `Create provider transaction submitted: ${tx.hash}`);
  return [[createLog, txLog], tx];
}

export async function findOrCreateProviderWithBlock(
  options: BaseFetchOptions
): Promise<LogsData<ProviderWithBlockNumber | null>> {
  const providerId = wallet.computeProviderId(options.provider);
  const idLog = logger.pend('DEBUG', `Computed provider ID from mnemonic: ${providerId}`);

  const fetchOptions = { ...options, providerId };
  const [providerBlockLogs, providerBlockData] = await getProviderAndBlockNumber(fetchOptions);
  if (!providerBlockData) {
    const logs = [idLog, ...providerBlockLogs];
    return [logs, null];
  }

  // If the extended public key was returned as an empty string, it means that the provider does
  // not exist onchain yet
  if (providerBlockData.xpub === '') {
    const createOptions = {
      ...options,
      adminAddress: providerBlockData.adminAddress,
      xpub: providerBlockData.xpub,
    };
    const [createLogs, _providerId] = await create(createOptions);
    const logs = [idLog, ...providerBlockLogs, ...createLogs];
    return [logs, providerBlockData];
  }

  const existsLog = logger.pend('DEBUG', `Skipping creation as provider ID:${providerId} was found`);
  return [[idLog, ...providerBlockLogs, existsLog], providerBlockData];
}
