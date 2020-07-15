import { ethers } from 'ethers';
import { go } from '../../utils/promise-utils';
import { config, FROM_BLOCK_LIMIT } from '../../config';
import { ProviderState, Request } from '../../../types';
import * as ethereum from '../../ethereum';

async function fetchEvents(state: ProviderState): Promise<ethers.utils.LogDescription[]> {
  const filter: ethers.providers.Filter = {
    fromBlock: state.currentBlock! - FROM_BLOCK_LIMIT,
    toBlock: state.currentBlock!,
    address: ethereum.contracts.ChainAPI.addresses[state.config.chainId],
    topics: [null, config.nodeSettings.providerId],
  };

  const [err, rawLogs] = await go(state.provider.getLogs(filter));
  if (err || !rawLogs) {
    const message = 'Unable to get request & fulfill events';
    ethereum.logProviderJSON(state.config.name, 'ERROR', message);
    // TODO: Provider calls should retry on failure (issue #11)
    throw new Error(message);
  }

  const chainAPIInterface = new ethers.utils.Interface(ethereum.contracts.ChainAPI.ABI);
  const events = rawLogs.map((log) => chainAPIInterface.parseLog(log));

  return events;
}

function mapRequests(events: ethers.utils.LogDescription[]): Request[] {
  return events.map(event => ({
    requestId: event.args.requestId,
    requester: event.args.requester,
    endpointId: event.args.endpointId || null,
    templateId: event.args.templateId || null,
    fulfillAddress: event.args.fulfillAddress,
    fulfillFunctionId: event.args.fulfillFunctionId,
    errorAddress: event.args.errorAddress,
    errorFunctionId: event.args.errorFunctionId,
    parameters: event.args.parameters,
  }));
}

export async function detect(providerState: ProviderState) {
  const events = await fetchEvents(providerState);

  const requests = mapRequests(events);

  return requests;
}
