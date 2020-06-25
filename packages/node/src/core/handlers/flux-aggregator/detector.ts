import { ethers } from 'ethers';
import flatMap from 'lodash/flatMap';
import { go, promiseTimeout } from '../../utils/promise-utils';
import * as logger from '../../utils/logger';
import { State } from '../../state';
import { getContractInterface } from '../../ethereum/contracts/aggregator';
import { FROM_BLOCK_LIMIT } from '../../config';
import { ApiSpecification, OracleSpecification, Specification } from '../../config/types';

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

  const newRequestsTopic = ethers.utils.id('NewRequest(address,uint256)');
  const fulfilledRequestsTopic = ethers.utils.id('RequestFulfilled(address,uint256)');

  const newRequestsFilter: ethers.providers.Filter = {
    fromBlock: state.currentBlock! - FROM_BLOCK_LIMIT,
    toBlock: state.currentBlock!,
    address: oracleSpec.trigger.value,
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

export async function detect(state: State, specs: Specification[]) {
  const fetchOracleLogEvents = flatMap(specs, (spec) => {
    return spec.oracleSpecifications.map((oracleSpec) => {
      const promise = fetchNewFluxRequests(state, spec.apiSpecifications, oracleSpec);
      // Each promise is only allowed a maximum of 5 seconds to complete
      return promiseTimeout(5000, promise).catch(() => null);
    });
  });

  const oracleLogEvents = await Promise.all(fetchOracleLogEvents);

  const successfulRequests = oracleLogEvents.filter((le) => !!le) as OracleLogEvent[];

  console.log(successfulRequests);
}
