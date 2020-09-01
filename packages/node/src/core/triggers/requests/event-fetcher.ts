import { ethers } from 'ethers';
import { config, FROM_BLOCK_LIMIT } from '../../config';
import * as ethereum from '../../ethereum';
import * as events from './events';
import { LogWithMetadata, ProviderState } from '../../../types';

interface GroupedLogs {
  apiCalls: LogWithMetadata[];
  walletDesignations: LogWithMetadata[];
  withdrawals: LogWithMetadata[];
}

async function fetchLogs(state: ProviderState): Promise<LogWithMetadata[]> {
  const filter: ethers.providers.Filter = {
    fromBlock: state.currentBlock! - FROM_BLOCK_LIMIT,
    toBlock: state.currentBlock!,
    address: ethereum.contracts.ChainAPI.addresses[state.config.chainId],
    // @ts-ignore
    topics: [null, config.nodeSettings.providerId],
  };

  // Let this throw if something goes wrong
  const rawLogs = await state.provider.getLogs(filter);

  const chainAPIInterface = new ethers.utils.Interface(ethereum.contracts.ChainAPI.ABI);
  const logsWithBlocks = rawLogs.map((log) => ({
    blockNumber: log.blockNumber,
    transactionHash: log.transactionHash,
    parsedLog: chainAPIInterface.parseLog(log),
  }));

  return logsWithBlocks;
}

function groupLogs(logsWithMetadata: LogWithMetadata[]): GroupedLogs {
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

export async function fetchGroupedLogs(state: ProviderState): Promise<GroupedLogs> {
  const logs = await fetchLogs(state);

  const groupedLogs = groupLogs(logs);

  return groupedLogs;
}
