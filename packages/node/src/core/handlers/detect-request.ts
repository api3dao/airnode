import { ethers } from 'ethers';
import { go } from '../utils/promise-utils';
import { State } from '../state';
import { specs } from '../config';
import { OracleSpecification } from '../config/types';

const FROM_BLOCK_LIMIT = 15;

function getNewRequestTopic() {
  return ethers.utils.id('NewRequest(address, uint256)');
}

async function collectFluxEvents(state: State, oracleSpec: OracleSpecification) {
  if (oracleSpec.trigger.type === 'fluxFeed') {
    const filter: ethers.providers.Filter = {
      fromBlock: state.currentBlock! - FROM_BLOCK_LIMIT,
      toBlock: state.currentBlock!,
      address: oracleSpec.trigger.value,
      topics: [getNewRequestTopic()],
    };

    const [err, logs] = await go(state.provider.getLogs(filter));
    if (err || !logs) {
      // TODO: Provider calls should retry on failure (issue #11)
      throw new Error(`Unable to get flux events for ${oracleSpec.trigger.value}. ${err}`);
    }
  }
  return [];
}

export function detect(state: State) {
  specs.forEach((spec) => {
    spec.oracleSpecifications.forEach((oracleSpec) => {
      collectFluxEvents(state, oracleSpec);
    });
  });
}
