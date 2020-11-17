import { ethers } from 'ethers';
import * as contracts from '../contracts';
import * as events from './events';
import { LogWithMetadata } from '../../../types';
import { retryOperation } from '../../utils/promise-utils';

interface FetchOptions {
  address: string;
  blockHistoryLimit: number;
  currentBlock: number;
  provider: ethers.providers.JsonRpcProvider;
  providerId: string;
}

interface GroupedLogs {
  apiCalls: LogWithMetadata[];
  withdrawals: LogWithMetadata[];
}

export async function fetch(options: FetchOptions): Promise<LogWithMetadata[]> {
  const filter: ethers.providers.Filter = {
    fromBlock: options.currentBlock - options.blockHistoryLimit,
    toBlock: options.currentBlock,
    address: options.address,
    // Ethers types don't support null for a topic, even though it's valid
    // @ts-ignore
    topics: [null, options.providerId],
  };

  const operation = () => options.provider.getLogs(filter);
  const retryableOperation = retryOperation(2, operation);

  // Let this throw if something goes wrong
  const rawLogs = await retryableOperation;

  // If the provider returns a bad response, mapping logs could also throw
  const airnodeInterface = new ethers.utils.Interface(contracts.Airnode.ABI);
  const logsWithBlocks = rawLogs.map((log) => ({
    blockNumber: log.blockNumber,
    transactionHash: log.transactionHash,
    parsedLog: airnodeInterface.parseLog(log),
  }));

  return logsWithBlocks;
}

export function group(logsWithMetadata: LogWithMetadata[]): GroupedLogs {
  const initialState: GroupedLogs = {
    apiCalls: [],
    withdrawals: [],
  };

  return logsWithMetadata.reduce((acc, log) => {
    const { parsedLog } = log;

    if (events.isApiCallRequest(parsedLog) || events.isApiCallFulfillment(parsedLog)) {
      return { ...acc, apiCalls: [...acc.apiCalls, log] };
    }

    if (events.isWithdrawalRequest(parsedLog) || events.isWithdrawalFulfillment(parsedLog)) {
      return { ...acc, withdrawals: [...acc.withdrawals, log] };
    }

    // Ignore other events
    return acc;
  }, initialState);
}
