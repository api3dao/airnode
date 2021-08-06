import { ethers } from 'ethers';
import isEqual from 'lodash/isEqual';
import { AirnodeRrpFactory } from './contracts';
import * as utils from './utils';
import * as wallet from './wallet';
import { go } from '../utils/promise-utils';
import * as logger from '../logger';
import { DEFAULT_RETRY_TIMEOUT_MS } from '../constants';
import { LogsData } from '../types';

interface AirnodeParametersExistOptions {
  readonly airnodeAdmin: string;
  readonly authorizers: string[];
  readonly masterHDNode: ethers.utils.HDNode;
}

interface BaseFetchOptions {
  readonly airnodeAdmin: string;
  readonly airnodeRrpAddress: string;
  readonly authorizers: string[];
  readonly masterHDNode: ethers.utils.HDNode;
  readonly provider: ethers.providers.JsonRpcProvider;
}

interface VerifyOptions extends BaseFetchOptions {
  readonly airnodeId: string;
}

interface AirnodeParametersData {
  readonly airnodeAdmin: string;
  readonly authorizers: string[];
  readonly blockNumber: number;
  readonly xpub: string;
}

interface SetAirnodeParametersOptions extends BaseFetchOptions {
  readonly currentXpub: string;
  readonly onchainData: AirnodeParametersData;
}

export function airnodeParametersMatch(
  options: AirnodeParametersExistOptions,
  onchainData: AirnodeParametersData
): boolean {
  const configAdmin = options.airnodeAdmin;
  const configAuthorizers = options.authorizers;
  return configAdmin === onchainData.airnodeAdmin && isEqual(configAuthorizers, onchainData.authorizers);
}

export function airnodeParametersExistOnchain(
  options: AirnodeParametersExistOptions,
  onchainData: AirnodeParametersData
): boolean {
  const currentXpub = wallet.getExtendedPublicKey(options.masterHDNode);
  return airnodeParametersMatch(options, onchainData) && currentXpub === onchainData.xpub;
}

export async function fetchAirnodeParametersWithData(
  fetchOptions: VerifyOptions
): Promise<LogsData<AirnodeParametersData | null>> {
  const airnodeRrp = AirnodeRrpFactory.connect(fetchOptions.airnodeRrpAddress, fetchOptions.provider);

  const fetchLog = logger.pend('INFO', 'Fetching current block and Airnode parameters...');

  const operation = () => airnodeRrp.getAirnodeParametersAndBlockNumber(fetchOptions.airnodeId);
  const [err, res] = await go(operation, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
  if (err || !res) {
    const errLog = logger.pend('ERROR', 'Unable to fetch current block and Airnode parameters', err);
    return [[fetchLog, errLog], null];
  }

  const data: AirnodeParametersData = {
    airnodeAdmin: res.admin,
    authorizers: res.authorizers,
    // Converting this BigNumber to a JS number should not throw as the current block number
    // should always be a valid number
    blockNumber: res.blockNumber.toNumber(),
    xpub: res.xpub,
  };

  const blockLog = logger.pend('INFO', `Current block:${res.blockNumber}`);

  if (!airnodeParametersExistOnchain(fetchOptions, data)) {
    const airnodeParametersLog = logger.pend('INFO', 'Airnode parameters not found');
    const logs = [fetchLog, blockLog, airnodeParametersLog];
    return [logs, data];
  }

  const addressLog = logger.pend('INFO', `Admin address:${res.admin}`);
  const xpubLog = logger.pend('INFO', `Airnode extended public key:${res.xpub}`);
  const logs = [fetchLog, blockLog, addressLog, xpubLog];
  return [logs, data];
}

export async function setAirnodeParameters(
  options: SetAirnodeParametersOptions
): Promise<LogsData<ethers.Transaction | {} | null>> {
  const { airnodeRrpAddress, authorizers, currentXpub, onchainData, airnodeAdmin } = options;
  const masterWallet = wallet.getWallet(options.masterHDNode.privateKey);

  const log1 = logger.pend('INFO', `Setting Airnode parameters with address:${masterWallet.address}...`);

  const connectedWallet = masterWallet.connect(options.provider);
  const airnodeRrp = AirnodeRrpFactory.connect(airnodeRrpAddress, connectedWallet);

  const log2 = logger.pend('INFO', 'Estimating transaction cost for setting Airnode parameters...');

  // Gas cost is 160,076
  const gasEstimateOp = () =>
    airnodeRrp.estimateGas.setAirnodeParametersAndForwardFunds(airnodeAdmin, currentXpub, authorizers, {
      gasLimit: 300_000,
      value: 1,
    });
  const [estimateErr, estimatedGasCost] = await go(gasEstimateOp, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
  if (estimateErr || !estimatedGasCost) {
    const errLog = logger.pend('ERROR', 'Unable to estimate transaction cost', estimateErr);
    return [[log1, log2, errLog], null];
  }
  // Overestimate a bit
  const gasLimit = estimatedGasCost.add(ethers.BigNumber.from(20_000));
  const log3 = logger.pend('INFO', `Estimated gas limit: ${gasLimit.toString()}`);

  // Fetch the current gas price
  const gasPriceOp = () => options.provider.getGasPrice();
  const [gasPriceErr, gasPrice] = await go(gasPriceOp, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
  if (gasPriceErr || !gasPrice) {
    const errLog = logger.pend('ERROR', 'Unable to fetch gas price', gasPriceErr);
    return [[log1, log2, log3, errLog], null];
  }
  const log4 = logger.pend('INFO', `Gas price set to ${utils.weiToGwei(gasPrice)} Gwei`);

  // Get the balance for the master wallet
  const balanceOp = () => options.provider.getBalance(masterWallet.address);
  const [balanceErr, masterWalletBalance] = await go(balanceOp, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
  if (balanceErr || !masterWalletBalance) {
    const errLog = logger.pend('ERROR', 'Unable to fetch master wallet balance', balanceErr);
    return [[log1, log2, log3, log4, errLog], null];
  }
  const log5 = logger.pend('INFO', `Master wallet balance: ${ethers.utils.formatEther(masterWalletBalance)} ETH`);

  // Send the entire balance less than transaction cost
  const txCost = gasLimit.mul(gasPrice);

  // NOTE: it's possible that the master wallet does not have sufficient funds
  // to set the Airnode parameters - yet they may have been set before with the correct
  // mnemonic/extended public key. Airnode can still serve requests, but any changes to fields
  // such as "authorizers" or "airnodeAdmin" will not be applied.
  if (
    txCost.gt(masterWalletBalance) &&
    onchainData.xpub !== '' &&
    currentXpub === onchainData.xpub &&
    !airnodeParametersMatch(options, onchainData)
  ) {
    const masterBal = ethers.utils.formatEther(masterWalletBalance);
    const ethTxCost = ethers.utils.formatEther(txCost);
    const warningMsg =
      'Unable to update onchain Airnode parameters as the master wallet does not have sufficient funds';
    const balanceMsg = `Current balance: ${masterBal} ETH. Estimated transaction cost: ${ethTxCost} ETH`;
    const updatesMsg =
      'Any updates to "airnodeAdmin" or "authorizers" will not take affect until the Airnode parameters have been updated';
    const warnLog = logger.pend('WARN', warningMsg);
    const balanceLog = logger.pend('WARN', balanceMsg);
    const updatesLog = logger.pend('WARN', updatesMsg);
    return [[log1, log2, log3, log4, warnLog, balanceLog, updatesLog], {}];
  }

  const fundsToSend = masterWalletBalance.sub(txCost);

  const log6 = logger.pend('INFO', 'Submitting set Airnode parameters transaction...');

  const setAirnodeParametersTx = () =>
    airnodeRrp.setAirnodeParametersAndForwardFunds(airnodeAdmin, currentXpub, authorizers, {
      value: fundsToSend,
      gasLimit,
      gasPrice,
    });
  const [txErr, tx] = await go(setAirnodeParametersTx, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
  if (txErr || !tx) {
    const errLog = logger.pend('ERROR', 'Unable to submit set Airnode parameters transaction', txErr);
    return [[log1, log2, log3, log4, log5, log6, errLog], null];
  }
  const log7 = logger.pend('INFO', `Set Airnode parameters transaction submitted:${tx.hash}`);
  const log8 = logger.pend(
    'INFO',
    'Airnode will not process requests until the set Airnode parameters transaction has been confirmed'
  );
  return [[log1, log2, log3, log4, log5, log6, log7, log8], tx];
}

export async function verifyOrSetAirnodeParameters(
  options: BaseFetchOptions
): Promise<LogsData<AirnodeParametersData | null>> {
  const airnodeId = wallet.getAirnodeId(options.masterHDNode);
  const idLog = logger.pend('DEBUG', `Computed Airnode ID from mnemonic:${airnodeId}`);

  const fetchOptions = { ...options, airnodeId };
  const [airnodeParametersBlockLogs, airnodeParametersBlockData] = await fetchAirnodeParametersWithData(fetchOptions);
  if (!airnodeParametersBlockData) {
    const logs = [idLog, ...airnodeParametersBlockLogs];
    return [logs, null];
  }

  // If the extended public key was returned as an empty string, it means that the Airnode paramters do
  // not exist onchain yet
  if (!airnodeParametersExistOnchain(options, airnodeParametersBlockData)) {
    const setAirnodeParametersOptions = {
      ...options,
      airnodeAdmin: options.airnodeAdmin,
      currentXpub: wallet.getExtendedPublicKey(options.masterHDNode),
      onchainData: airnodeParametersBlockData,
    };
    const [setAirnodeParametersLogs, _setAirnodeParametersRes] = await setAirnodeParameters(
      setAirnodeParametersOptions
    );
    const logs = [idLog, ...airnodeParametersBlockLogs, ...setAirnodeParametersLogs];
    return [logs, airnodeParametersBlockData];
  }

  const existsLog = logger.pend('DEBUG', `Skipping Airnode parameters setting as the Airnode parameters exist`);
  return [[idLog, ...airnodeParametersBlockLogs, existsLog], airnodeParametersBlockData];
}
