import { ethers } from 'ethers';
import isEqual from 'lodash/isEqual';
import { Airnode, Convenience } from './contracts';
import { go, retryOperation } from '../utils/promise-utils';
import * as logger from '../logger';
import * as utils from './utils';
import * as wallet from './wallet';
import { LogsData } from '../types';
import { OPERATION_RETRIES } from '../constants';

interface ProviderExistsOptions {
  authorizers: string[];
  masterHDNode: ethers.utils.HDNode;
  providerAdmin?: string;
}

interface BaseFetchOptions {
  airnodeAddress: string;
  authorizers: string[];
  convenienceAddress: string;
  masterHDNode: ethers.utils.HDNode;
  provider: ethers.providers.JsonRpcProvider;
  providerAdmin?: string;
}

interface FindOptions extends BaseFetchOptions {
  providerId: string;
}

interface CreateOptions extends BaseFetchOptions {
  providerAdmin: string;
  xpub: string;
}

interface ProviderData {
  authorizers: string[];
  blockNumber: number;
  providerAdmin: string;
  xpub: string;
}

export function providerExistsOnchain(options: ProviderExistsOptions, onchainData: ProviderData): boolean {
  const configAdmin = options.providerAdmin;
  const configAuthorizers = options.authorizers;
  const currentXpub = wallet.getExtendedPublicKey(options.masterHDNode);

  return (
    configAdmin === onchainData.providerAdmin &&
    isEqual(configAuthorizers, onchainData.authorizers) &&
    currentXpub === onchainData.xpub
  );
}

export async function fetchProviderWithData(fetchOptions: FindOptions): Promise<LogsData<ProviderData | null>> {
  const convenience = new ethers.Contract(fetchOptions.convenienceAddress, Convenience.ABI, fetchOptions.provider);
  const operation = () => convenience.getProviderAndBlockNumber(fetchOptions.providerId) as Promise<any>;
  const retryableOperation = retryOperation(OPERATION_RETRIES, operation);

  const fetchLog = logger.pend('INFO', 'Fetching current block and provider admin details...');

  const [err, res] = await go(retryableOperation);
  if (err || !res) {
    const errLog = logger.pend('ERROR', 'Unable to fetch current block and provider admin details', err);
    return [[fetchLog, errLog], null];
  }

  const data: ProviderData = {
    authorizers: res.authorizers,
    // Converting this BigNumber to a JS number should not throw as the current block number
    // should always be a valid number
    blockNumber: res.blockNumber.toNumber(),
    providerAdmin: res.admin,
    xpub: res.xpub,
  };

  const blockLog = logger.pend('INFO', `Current block:${res.blockNumber}`);

  if (!providerExistsOnchain(fetchOptions, data)) {
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
  const { airnodeAddress, authorizers, providerAdmin, xpub } = options;

  const log1 = logger.pend('INFO', `Creating provider with address:${providerAdmin}...`);

  const masterWallet = wallet.getWallet(options.masterHDNode.privateKey);
  const connectedWallet = masterWallet.connect(options.provider);
  const airnode = new ethers.Contract(airnodeAddress, Airnode.ABI, connectedWallet);

  const log2 = logger.pend('INFO', 'Estimating transaction cost for creating provider...');

  // Gas cost is 160,076
  const gasEstimateOp = () =>
    airnode.estimateGas.createProvider(providerAdmin, xpub, authorizers, {
      gasLimit: 300_000,
      value: 1,
    });
  const retryableGasEstimateOp = retryOperation(OPERATION_RETRIES, gasEstimateOp);
  const [estimateErr, estimatedGasCost] = await go(retryableGasEstimateOp);
  if (estimateErr || !estimatedGasCost) {
    const errLog = logger.pend('ERROR', 'Unable to estimate transaction cost', estimateErr);
    return [[log1, log2, errLog], null];
  }
  // Overestimate a bit
  const gasLimit = estimatedGasCost.add(ethers.BigNumber.from(20_000));
  const log3 = logger.pend('INFO', `Estimated gas limit: ${gasLimit.toString()}`);

  // Fetch the current gas price
  const gasPriceOp = () => options.provider.getGasPrice();
  const retryableGasPriceOp = retryOperation(OPERATION_RETRIES, gasPriceOp);
  const [gasPriceErr, gasPrice] = await go(retryableGasPriceOp);
  if (gasPriceErr || !gasPrice) {
    const errLog = logger.pend('ERROR', 'Unable to fetch gas price', gasPriceErr);
    return [[log1, log2, log3, errLog], null];
  }
  const log4 = logger.pend('INFO', `Gas price set to ${utils.weiToGwei(gasPrice)} Gwei`);

  // Get the balance for the master wallet
  const balanceOp = () => options.provider.getBalance(masterWallet.address);
  const retryableBalanceOp = retryOperation(OPERATION_RETRIES, balanceOp);
  const [balanceErr, masterWalletBalance] = await go(retryableBalanceOp);
  if (balanceErr || !masterWalletBalance) {
    const errLog = logger.pend('ERROR', 'Unable to fetch master wallet balance', balanceErr);
    return [[log1, log2, log3, log4, errLog], null];
  }
  const log5 = logger.pend('INFO', `Master wallet balance: ${ethers.utils.formatEther(masterWalletBalance)} ETH`);

  // Send the entire balance less than transaction cost
  const txCost = gasLimit.mul(gasPrice);
  const fundsToSend = masterWalletBalance.sub(txCost);

  const log6 = logger.pend('INFO', 'Submitting create provider transaction...');

  const createProviderTx = () =>
    airnode.createProvider(providerAdmin, xpub, authorizers, {
      value: fundsToSend,
      gasLimit,
      gasPrice,
    }) as Promise<any>;
  const retryableCreateProviderTx = retryOperation(OPERATION_RETRIES, createProviderTx);
  const [txErr, tx] = await go(retryableCreateProviderTx);
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

export async function findOrCreateProvider(options: BaseFetchOptions): Promise<LogsData<ProviderData | null>> {
  const providerId = wallet.getProviderId(options.masterHDNode);
  const idLog = logger.pend('DEBUG', `Computed provider ID from mnemonic:${providerId}`);

  const fetchOptions = { ...options, providerId };
  const [providerBlockLogs, providerBlockData] = await fetchProviderWithData(fetchOptions);
  if (!providerBlockData) {
    const logs = [idLog, ...providerBlockLogs];
    return [logs, null];
  }

  // If the extended public key was returned as an empty string, it means that the provider does
  // not exist onchain yet
  if (!providerExistsOnchain(options, providerBlockData)) {
    if (!options.providerAdmin) {
      const errLog = logger.pend('ERROR', 'Unable to find providerAdmin address in config');
      return [[idLog, ...providerBlockLogs, errLog], null];
    }

    const createOptions = {
      ...options,
      providerAdmin: options.providerAdmin,
      xpub: wallet.getExtendedPublicKey(options.masterHDNode),
    };
    const [createLogs, _createTx] = await create(createOptions);
    const logs = [idLog, ...providerBlockLogs, ...createLogs];
    return [logs, providerBlockData];
  }

  const existsLog = logger.pend('DEBUG', `Skipping provider creation as the provider exists`);
  return [[idLog, ...providerBlockLogs, existsLog], providerBlockData];
}
