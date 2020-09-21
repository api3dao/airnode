import { ethers } from 'ethers';
import { config, FROM_BLOCK_LIMIT } from '../../../config';
import * as contracts from '../../contracts';
import * as events from './events';
import { LogWithMetadata } from '../../../../types';

interface FetchOptions {
  address: string;
  currentBlock: number;
  provider: ethers.providers.JsonRpcProvider;
}

interface GroupedLogs {
  apiCalls: LogWithMetadata[];
  walletDesignations: LogWithMetadata[];
  withdrawals: LogWithMetadata[];
}

export async function fetch(options: FetchOptions): Promise<LogWithMetadata[]> {
  const filter: ethers.providers.Filter = {
    fromBlock: options.currentBlock - FROM_BLOCK_LIMIT,
    toBlock: options.currentBlock,
    address: options.address,
    // Ethers types don't support null for a topic, even though it's valid
    // @ts-ignore
    topics: [null, config.nodeSettings.providerId],
  };

  // Let this throw if something goes wrong
  const rawLogs = await options.provider.getLogs(filter);

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
    walletDesignations: [],
    withdrawals: [],
  };

  return logsWithMetadata.reduce((acc, log) => {
    const { parsedLog } = log;

    if (events.isApiCallRequest(parsedLog) || events.isApiCallFulfillment(parsedLog)) {
      return { ...acc, apiCalls: [...acc.apiCalls, log] };
    }

    if (events.isWalletDesignationRequest(parsedLog) || events.isWalletDesignationFulfillment(parsedLog)) {
      return { ...acc, walletDesignations: [...acc.walletDesignations, log] };
    }

    if (events.isWithdrawalRequest(parsedLog) || events.isWithdrawalFulfillment(parsedLog)) {
      return { ...acc, withdrawals: [...acc.withdrawals, log] };
    }

    // Ignore other events
    return acc;
  }, initialState);
}
