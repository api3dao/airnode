import { ethers } from 'ethers';
import { LogWithMetadata, ProviderState } from 'src/types';
import { config, FROM_BLOCK_LIMIT } from 'src/core/config';
import * as ethereum from 'src/core/ethereum';
import * as events from './events';

interface GroupedLogs {
  apiCalls: LogWithMetadata[];
  walletDesignations: LogWithMetadata[];
  withdrawals: LogWithMetadata[];
}

export async function fetch(state: ProviderState): Promise<LogWithMetadata[]> {
  const filter: ethers.providers.Filter = {
    fromBlock: state.currentBlock! - FROM_BLOCK_LIMIT,
    toBlock: state.currentBlock!,
    address: ethereum.contracts.Airnode.addresses[state.config.chainId],
    // Ethers types don't support null for a topic, even though it's valid
    // @ts-ignore
    topics: [null, config.nodeSettings.providerId],
  };

  // Let this throw if something goes wrong
  const rawLogs = await state.provider.getLogs(filter);

  const airnodeInterface = new ethers.utils.Interface(ethereum.contracts.Airnode.ABI);
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
