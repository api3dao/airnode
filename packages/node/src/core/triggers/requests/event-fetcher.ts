import { ethers } from 'ethers';
import { go } from '../../utils/promise-utils';
import { config, FROM_BLOCK_LIMIT } from '../../config';
import { ProviderState } from '../../../types';
import * as ethereum from '../../ethereum';
import * as logger from '../../utils/logger';
import * as events from './events';

interface GroupedLogs {
  apiCalls: Log[];
  walletAuthorizations: Log[];
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

  const [err, rawLogs] = await go(state.provider.getLogs(filter));
  if (err || !rawLogs) {
    const message = 'Unable to get request & fulfill events';
    logger.logProviderJSON(state.config.name, 'ERROR', message);
    // TODO: Provider calls should retry on failure (issue #11)
    throw new Error(message);
  }

  const chainAPIInterface = new ethers.utils.Interface(ethereum.contracts.ChainAPI.ABI);
  const logs = rawLogs.map((log) => chainAPIInterface.parseLog(log));

  return logs;
}

function groupLogs(logs: Log[]): GroupedLogs {
  const initialState: GroupedLogs = {
    apiCalls: [],
    walletAuthorizations: [],
    withdrawals: [],
  };

  return logs.reduce((acc, log) => {
    if (events.isApiCallEvent(log) || events.isApiCallFulfillmentEvent(log)) {
      return { ...acc, apiCalls: [...acc.apiCalls, log] };
    }

    if (events.isWithdrawalEvent(log) || events.isWithdrawalFulfillmentEvent(log)) {
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
