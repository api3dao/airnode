import { ethers } from 'ethers';
import { Airnode, Convenience } from './contracts';
import { go, retryOperation } from '../utils/promise-utils';
import * as logger from '../logger';
import * as utils from './utils';
import * as wallet from './wallet';
import { LogsData } from '../../types';

interface BaseFetchOptions {
  adminAddressForCreatingProviderRecord?: string;
  airnodeAddress: string;
  convenienceAddress: string;
  provider: ethers.providers.JsonRpcProvider;
}

interface FindOptions extends BaseFetchOptions {
  providerId: string;
}

interface CreateOptions extends BaseFetchOptions {
  adminAddressForCreatingProviderRecord: string;
  airnodeAddress: string;
  provider: ethers.providers.JsonRpcProvider;
  xpub: string;
}

interface ProviderWithBlockNumber {
  adminAddressForCreatingProviderRecord: string;
  blockNumber: number;
  providerExists: boolean;
  xpub: string;
}

export async function findWithBlock(fetchOptions: FindOptions): Promise<LogsData<ProviderWithBlockNumber | null>> {
  const convenience = new ethers.Contract(fetchOptions.convenienceAddress, Convenience.ABI, fetchOptions.provider);
  const contractCall = () => convenience.getProviderAndBlockNumber(fetchOptions.providerId);
  const retryableContractCall = retryOperation(2, contractCall, { timeouts: [5000, 5000] }) as Promise<any>;

  const fetchLog = logger.pend('INFO', 'Fetching current block and provider admin details...');

  const [err, res] = await go(retryableContractCall);
  if (err || !res) {
    const errLog = logger.pend('ERROR', 'Unable to fetch current block and provider admin details', err);
    return [[fetchLog, errLog], null];
  }

  const data: ProviderWithBlockNumber = {
    adminAddressForCreatingProviderRecord: res.admin,
    // Converting this BigNumber to a JS number should not throw as the current block number
    // should always be a valid number
    blockNumber: res.blockNumber.toNumber(),
    providerExists: !!res.xpub && res.xpub !== '',
    xpub: res.xpub,
  };

  const blockLog = logger.pend('INFO', `Current block:${res.blockNumber}`);

  if (!data.providerExists) {
    const providerLog = logger.pend('INFO', 'Provider not found');
    const logs = [fetchLog, blockLog, providerLog];
    return [logs, data];
  }

  const addressLog = logger.pend('INFO', `Admin address:${res.admin}`);
  const xpubLog = logger.pend('INFO', `Provider extended public key:${res.xpub}`);
  const logs = [fetchLog, blockLog, addressLog, xpubLog];
  return [logs, data];
}

export async function create(options: CreateOptions): Promise<LogsData<ethers.Transaction | null>> {
  const log1 = logger.pend(
    'INFO',
    `Creating provider with address:${options.adminAddressForCreatingProviderRecord}...`
  );

  const masterWallet = wallet.getMasterWallet(options.provider);
  const airnode = new ethers.Contract(options.airnodeAddress, Airnode.ABI, masterWallet);

  const log2 = logger.pend('INFO', 'Estimating transaction cost for creating provider...');

  // Gas cost is 160,076
  const [estimateErr, estimatedGasCost] = await go(
    airnode.estimateGas.createProvider(options.adminAddressForCreatingProviderRecord, options.xpub, { value: 1 })
  );
  if (estimateErr || !estimatedGasCost) {
    const errLog = logger.pend('ERROR', 'Unable to estimate transaction cost', estimateErr);
    return [[log1, log2, errLog], null];
  }
  // Overestimate a bit
  const gasLimit = estimatedGasCost.add(ethers.BigNumber.from(20_000));
  const log3 = logger.pend('INFO', `Estimated gas limit: ${gasLimit.toString()}`);

  // Fetch the current gas price
  const [gasPriceErr, gasPrice] = await go(options.provider.getGasPrice());
  if (gasPriceErr || !gasPrice) {
    const errLog = logger.pend('ERROR', 'Unable to fetch gas price', gasPriceErr);
    return [[log1, log2, log3, errLog], null];
  }
  const log4 = logger.pend('INFO', `Gas price set to ${utils.weiToGwei(gasPrice)} Gwei`);

  // Get the balance for the master wallet
  const [balanceErr, masterWalletBalance] = await go(options.provider.getBalance(masterWallet.address));
  if (balanceErr || !masterWalletBalance) {
    const errLog = logger.pend('ERROR', 'Unable to fetch master wallet balance', balanceErr);
    return [[log1, log2, log3, log4, errLog], null];
  }
  const log5 = logger.pend('INFO', `Master wallet balance: ${ethers.utils.formatEther(masterWalletBalance)} ETH`);

  // Send the entire balance less than transaction cost
  const txCost = gasLimit.mul(gasPrice);
  const fundsToSend = masterWalletBalance.sub(txCost);

  const log6 = logger.pend('INFO', 'Submitting create provider transaction...');

  const createProviderTx = airnode.createProvider(options.adminAddressForCreatingProviderRecord, options.xpub, {
    value: fundsToSend,
    gasLimit,
    gasPrice,
  });
  const [txErr, tx] = (await go(createProviderTx)) as any;
  if (txErr || !tx) {
    const errLog = logger.pend('ERROR', 'Unable to submit create provider transaction', txErr);
    return [[log1, log2, log3, log4, log5, log6, errLog], null];
  }
  const log7 = logger.pend('INFO', `Create provider transaction submitted:${tx.hash}`);
  const log8 = logger.pend(
    'INFO',
    'Airnode will not process requests until the create provider transaction has been confirmed'
  );
  return [[log1, log2, log3, log4, log5, log6, log7, log8], tx];
}

export async function findOrCreateProviderWithBlock(
  options: BaseFetchOptions
): Promise<LogsData<ProviderWithBlockNumber | null>> {
  const providerId = wallet.computeProviderId(options.provider);
  const idLog = logger.pend('DEBUG', `Computed provider ID from mnemonic:${providerId}`);

  const fetchOptions = { ...options, providerId };
  const [providerBlockLogs, providerBlockData] = await findWithBlock(fetchOptions);
  if (!providerBlockData) {
    const logs = [idLog, ...providerBlockLogs];
    return [logs, null];
  }

  // If the extended public key was returned as an empty string, it means that the provider does
  // not exist onchain yet
  if (!providerBlockData.providerExists) {
    if (!options.adminAddressForCreatingProviderRecord) {
      const errLog = logger.pend('ERROR', 'Unable to find adminAddressForCreatingProviderRecord address');
      return [[idLog, ...providerBlockLogs, errLog], null];
    }

    const createOptions = {
      ...options,
      adminAddressForCreatingProviderRecord: options.adminAddressForCreatingProviderRecord,
      xpub: wallet.getExtendedPublicKey(),
    };
    const [createLogs, _createTx] = await create(createOptions);
    const logs = [idLog, ...providerBlockLogs, ...createLogs];
    return [logs, providerBlockData];
  }

  const existsLog = logger.pend('DEBUG', `Skipping provider creation as the provider exists`);
  return [[idLog, ...providerBlockLogs, existsLog], providerBlockData];
}
