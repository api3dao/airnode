import { ethers } from 'ethers';
import * as events from './events';
import { AirnodeRrpV0Factory } from '../contracts';
import {
  EVMEventLog,
  EVMMadeRequestLog,
  EVMFulfilledRequestLog,
  EVMFulfilledWithdrawalLog,
  EVMRequestedWithdrawalLog,
  AirnodeLogDescription,
} from '../../types';

export interface FetchOptions {
  readonly address: string;
  readonly airnodeAddress: string;
  readonly blockHistoryLimit: number;
  readonly currentBlock: number;
  readonly minConfirmations: number;
  readonly mayOverrideMinConfirmations: boolean;
  readonly provider: ethers.providers.JsonRpcProvider;
  readonly chainId: string;
}

interface GroupedLogs {
  readonly apiCalls: (EVMMadeRequestLog | EVMFulfilledRequestLog)[];
  readonly withdrawals: (EVMFulfilledWithdrawalLog | EVMRequestedWithdrawalLog)[];
}

// NOTE: The generic parameter could have a better default value (unknown instead of any) but doing so would make the
// tests less readable because a lot of type casting would be needed.
export function parseAirnodeRrpLog<T = { readonly args: any }>(log: ethers.providers.Log): AirnodeLogDescription<T> {
  const airnodeRrpInterface = new ethers.utils.Interface(AirnodeRrpV0Factory.abi);
  const parsedLog = airnodeRrpInterface.parseLog(log);
  return parsedLog as AirnodeLogDescription<T>;
}

export async function fetch(options: FetchOptions): Promise<EVMEventLog[]> {
  // Protect against a potential negative fromBlock value
  const fromBlock = Math.max(0, options.currentBlock - options.blockHistoryLimit);
  // toBlock should always be >= fromBlock
  const toBlock = Math.max(
    fromBlock,
    // Fetch up to currentBlock to handle possibility of _minConfirmations parameter in request
    options.currentBlock - (options.mayOverrideMinConfirmations ? 0 : options.minConfirmations)
  );

  const filter: ethers.providers.Filter = {
    fromBlock,
    toBlock,
    address: options.address,
    topics: [null, ethers.utils.hexZeroPad(options.airnodeAddress, 32)],
  };

  // Let this throw if something goes wrong
  const rawLogs = await options.provider.getLogs(filter);

  const logsWithBlocks = rawLogs.map((log) => ({
    address: log.address,
    blockNumber: log.blockNumber,
    currentBlock: options.currentBlock,
    minConfirmations: options.minConfirmations,
    transactionHash: log.transactionHash,
    logIndex: log.logIndex,
    chainId: options.chainId,
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
