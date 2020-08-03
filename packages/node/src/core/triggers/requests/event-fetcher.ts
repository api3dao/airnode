import { ethers } from 'ethers';
import { config, FROM_BLOCK_LIMIT } from '../../config';
import { ProviderState } from '../../../types';
import * as ethereum from '../../ethereum';
import * as events from './events';

interface GroupedLogs {
  apiCalls: Log[];
  walletDesignations: Log[];
  withdrawals: Log[];
}

// Shortening the type
type Log = ethers.utils.LogDescription;

async function fetchLogs(state: ProviderState): Promise<Log[]> {
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
  const logs = rawLogs.map((log) => chainAPIInterface.parseLog(log));

  return logs;
}

function groupLogs(logs: Log[]): GroupedLogs {
  const initialState: GroupedLogs = {
    apiCalls: [],
    walletDesignations: [],
    withdrawals: [],
  };

  return logs.reduce((acc, log) => {
    if (events.isApiCallRequest(log) || events.isApiCallFulfillment(log)) {
      return { ...acc, apiCalls: [...acc.apiCalls, log] };
    }

    if (events.isWalletDesignationRequest(log) || events.isWalletDesignationFulfillment(log)) {
      return { ...acc, walletDesignations: [...acc.walletDesignations, log] };
    }

    if (events.isWithdrawalRequest(log) || events.isWithdrawalFulfillment(log)) {
      return { ...acc, withdrawals: [...acc.withdrawals, log] };
    }

    // Ignore other events
    return acc;
  }, initialState);
}

export async function fetchGroupedLogs(state: ProviderState): Promise<GroupedLogs> {
  const logs = await fetchLogs(state);

  return groupLogs(logs);
}
