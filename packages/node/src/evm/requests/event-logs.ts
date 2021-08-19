import { ethers } from 'ethers';
import * as events from './events';
import { retryOperation } from '../../utils/promise-utils';
import { AirnodeRrpArtifact } from '../contracts';
import { DEFAULT_RETRY_TIMEOUT_MS } from '../../constants';
import {
  EVMEventLog,
  AirnodeRrpFilters,
  AirnodeRrpLog,
  EVMMadeRequestLog,
  EVMFulfilledRequestLog,
  EVMFulfilledWithdrawalLog,
  EVMRequestedWithdrawalLog,
  AirnodeLogDescription,
} from '../../types';

interface FetchOptions {
  readonly address: string;
  readonly airnodeId: string;
  readonly blockHistoryLimit: number;
  readonly currentBlock: number;
  readonly ignoreBlockedRequestsAfterBlocks: number;
  readonly provider: ethers.providers.JsonRpcProvider;
}

interface GroupedLogs {
  readonly apiCalls: (EVMMadeRequestLog | EVMFulfilledRequestLog)[];
  readonly withdrawals: (EVMFulfilledWithdrawalLog | EVMRequestedWithdrawalLog)[];
}

export function parseAirnodeRrpLog<T extends keyof AirnodeRrpFilters>(
  log: ethers.providers.Log
): AirnodeLogDescription<AirnodeRrpLog<T>> {
  const airnodeRrpInterface = new ethers.utils.Interface(AirnodeRrpArtifact.abi);
  const parsedLog = airnodeRrpInterface.parseLog(log);
  return parsedLog as AirnodeLogDescription<AirnodeRrpLog<T>>;
}

export async function fetch(options: FetchOptions): Promise<EVMEventLog[]> {
  // Protect against a potential negative fromBlock value
  const fromBlock = Math.max(0, options.currentBlock - options.blockHistoryLimit);

  const filter: ethers.providers.Filter = {
    fromBlock,
    toBlock: options.currentBlock,
    address: options.address,
    // Ethers types don't support null for a topic, even though it's valid
    // @ts-ignore
    topics: [null, options.airnodeId],
  };

  const operation = () => options.provider.getLogs(filter);
  const retryableOperation = retryOperation(operation, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });

  // Let this throw if something goes wrong
  const rawLogs = await retryableOperation;

  const logsWithBlocks = rawLogs.map((log) => ({
    blockNumber: log.blockNumber,
    currentBlock: options.currentBlock,
    ignoreBlockedRequestsAfterBlocks: options.ignoreBlockedRequestsAfterBlocks,
    transactionHash: log.transactionHash,
    // If the provider returns a bad response, mapping logs could also throw
    parsedLog: parseAirnodeRrpLog(log),
  })) as EVMEventLog[];

  return logsWithBlocks;
}

export function group(logsWithMetadata: EVMEventLog[]): GroupedLogs {
  const initialState: GroupedLogs = {
    apiCalls: [],
    withdrawals: [],
  };

  return logsWithMetadata.reduce((acc, log) => {
    if (events.isApiCallRequest(log) || events.isApiCallFulfillment(log)) {
      return { ...acc, apiCalls: [...acc.apiCalls, log] };
    }

    if (events.isWithdrawalRequest(log) || events.isWithdrawalFulfillment(log)) {
      return { ...acc, withdrawals: [...acc.withdrawals, log] };
    }

    // Ignore other events
    return acc;
  }, initialState);
}
