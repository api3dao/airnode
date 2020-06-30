import { ethers } from 'ethers';
import flatMap from 'lodash/flatMap';
import { go, promiseTimeout } from '../../utils/promise-utils';
import * as logger from '../../utils/logger';
import { State } from '../../state';
import { getContractInterface } from '../../ethereum/contracts/aggregator';
import { FROM_BLOCK_LIMIT, NODE_WALLET_ADDRESS } from '../../config';
import { ApiSpecification, OracleSpecification, Specification } from '../../config/types';

const newRequestsTopic = ethers.utils.id('NewRequest(address,uint256)');
const fulfilledRequestsTopic = ethers.utils.id('RequestFulfilled(address,uint256)');

interface OracleLogEvent {
  apiSpecId: string;
  events: ethers.utils.LogDescription[];
  oracleSpecId: string;
}

async function fetchNewFluxRequests(
  state: State,
  apiSpec: ApiSpecification,
  oracleSpec: OracleSpecification
): Promise<OracleLogEvent | null> {
  if (oracleSpec.trigger.type !== 'fluxFeed') {
    return null;
  }

  const newRequestsFilter: ethers.providers.Filter = {
    fromBlock: state.currentBlock! - FROM_BLOCK_LIMIT,
    toBlock: state.currentBlock!,
    address: oracleSpec.trigger.value,
    // Fetch events for both topics in one call
    topics: [[newRequestsTopic, fulfilledRequestsTopic]],
  };

  const [err, rawLogs] = await go(state.provider.getLogs(newRequestsFilter));
  if (err || !rawLogs) {
    // TODO: Provider calls should retry on failure (issue #11)
    const message = `Unable to get flux request events for ${oracleSpec.trigger.value}`;
    logger.logJSON('ERROR', `${message}. ${err}`);
    throw new Error(message);
  }

  const aggregatorInterface = getContractInterface();
  const events = rawLogs.map((log) => aggregatorInterface.parseLog(log));

  return {
    events,
    apiSpecId: apiSpec.id!,
    oracleSpecId: oracleSpec.id!,
  };
}

interface SplitEvents {
  newRequests: ethers.utils.LogDescription[];
  fulfilledRequests: ethers.utils.LogDescription[];
}

function groupEvents(events: ethers.utils.LogDescription[]) {
  return events.reduce(
    (acc: SplitEvents, event) => {
      if (event.topic === newRequestsTopic) {
        return { ...acc, newRequests: [...acc.newRequests, event] };
      }
      return { ...acc, fulfilledRequests: [...acc.fulfilledRequests, event] };
    },
    { newRequests: [], fulfilledRequests: [] }
  );
}

function filterPendingRequests(oracleEvents: OracleLogEvent[]) {
  return oracleEvents.reduce((acc: OracleLogEvent[], oracleEvent) => {
    const { newRequests, fulfilledRequests } = groupEvents(oracleEvent.events);

    // TODO: we may/may not be able to do this filtering when making the `getLogs` call
    // We only care about new requests from other nodes
    const newRequestsFromOtherNodes = newRequests.filter((nr) => nr.args.requester !== NODE_WALLET_ADDRESS);

    // We only care about fulfilled events for this node
    const fulfillmentsForThisNode = fulfilledRequests.filter((fr) => fr.args.requester === NODE_WALLET_ADDRESS);

    // If there are any new requests from other nodes that this node has not yet fulfilled, add that to the list
    const isFulfilled = newRequestsFromOtherNodes.some((newRequest) => {
      const { requester, requestInd } = newRequest.args;

      return fulfillmentsForThisNode.some((fr) => fr.args.requester === requester && fr.args.requestInd === requestInd);
    });

    return isFulfilled ? acc : [...acc, oracleEvent];
  }, []);
}

// TODO: needs tests
export async function detect(state: State, specs: Specification[]) {
  const oracleLogEventRequests = flatMap(specs, (spec) => {
    return spec.oracleSpecifications.map((oracleSpec) => {
      const promise = fetchNewFluxRequests(state, spec.apiSpecifications, oracleSpec);
      // Each promise is only allowed a maximum of 10 seconds to complete
      // TODO: Is this too much?
      return promiseTimeout(10_000, promise).catch(() => null);
    });
  });

  const oracleLogEvents = await Promise.all(oracleLogEventRequests);

  // Filter out promises that failed or timed out
  const successfulEvents = oracleLogEvents.filter((le) => !!le) as OracleLogEvent[];

  const pendingRequests = filterPendingRequests(successfulEvents);

  return pendingRequests;
}
