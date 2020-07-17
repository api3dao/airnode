import { ethers } from 'ethers';
import { go } from '../../utils/promise-utils';
import { config, FROM_BLOCK_LIMIT } from '../../config';
import { ProviderState, Request } from '../../../types';
import * as request from './request';
import * as ethereum from '../../ethereum';
import * as logger from '../../utils/logger';

// Shorten the type
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

function filterRequestLogs(logs: Log[]): Log[] {
  const topics = [ethereum.contracts.ChainAPI.topics.RequestMade, ethereum.contracts.ChainAPI.topics.FullRequestMade];

  return logs.filter((log) => topics.includes(log.topic));
}

function filterFulfilledLogs(logs: Log[]): Log[] {
  const topics = [
    ethereum.contracts.ChainAPI.topics.FulfillmentSuccessful,
    ethereum.contracts.ChainAPI.topics.FulfillmentBytesSuccessful,
    ethereum.contracts.ChainAPI.topics.FulfillmentErrored,
    ethereum.contracts.ChainAPI.topics.FulfillmentFailed,
  ];

  return logs.filter((log) => topics.includes(log.topic));
}

function discardFulfilledRequests(state: ProviderState, requestLogs: Log[], fulfillmentLogs: Log[]): Log[] {
  const fulfilledRequestIds = fulfillmentLogs.map((fl) => fl.args.requestId);

  return requestLogs.reduce((acc, requestLog) => {
    const { requestId } = requestLog.args;
    if (fulfilledRequestIds.includes(requestId)) {
      logger.logProviderJSON(state.config.name, 'DEBUG', `Request ID:${requestId} has already been fulfilled`);
      return acc;
    }
    return [...acc, requestLog];
  }, []);
}

function mapRequests(state: ProviderState, logs: Log[]): Request[] {
  return logs.map((log) => request.initialize(state, log));
}

export async function fetchUnfulfilledRequests(providerState: ProviderState) {
  const logs = await fetchLogs(providerState);

  const requestLogs = filterRequestLogs(logs);
  const fulfillmentLogs = filterFulfilledLogs(logs);

  const unfulfilledRequests = discardFulfilledRequests(providerState, requestLogs, fulfillmentLogs);

  const requests = mapRequests(providerState, unfulfilledRequests);

  return requests;
}
