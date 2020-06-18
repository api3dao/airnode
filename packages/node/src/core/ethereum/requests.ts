import { ethers } from 'ethers';
import * as logger from '../utils/logger';
import * as ethereum from './';

// Limit our search to 15 blocks in the past
const PAST_BLOCK_LIMIT = 15;

export function getOracleRequestTopic() {
  return ethers.utils.id('OracleRequest(bytes32,address,bytes32,uint256,address,bytes4,uint256,uint256,bytes)');
}

export function getOracleRequests(toBlock: number) {
  const filter: ethers.providers.Filter = {
    toBlock,
    fromBlock: toBlock - PAST_BLOCK_LIMIT,
    address: '<TODO>',
    topics: [getOracleRequestTopic()],
  };

  logger.logJSON('INFO', `Collecting oracle requests from Block ${filter.fromBlock} to Block ${filter.toBlock}`);

  return ethereum.getProvider().getLogs(filter);
}

export function parseOracleRequestLog(log: ethers.providers.Log) {
  const contractInterface = new ethers.utils.Interface('<TODO>');
  return contractInterface.parseLog(log).args.values;
}
