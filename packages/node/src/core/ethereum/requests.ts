import { ethers } from 'ethers';
import * as logger from '../utils/logger';
import * as ethereum from './';

export function getOracleRequestTopic() {
  return ethers.utils.id('OracleRequest(bytes32,address,bytes32,uint256,address,bytes4,uint256,uint256,bytes)');
}

// Limit our search to 15 blocks in the past
const PAST_BLOCK_LIMIT = 15;

export function getOracleRequests(toBlock: number, address: string) {
  const filter: ethers.providers.Filter = {
    address,
    toBlock,
    fromBlock: toBlock - PAST_BLOCK_LIMIT,
    topics: [getOracleRequestTopic()],
  };

  logger.logJSON('INFO', `Collecting oracle requests from Block ${filter.fromBlock} to Block ${filter.toBlock}`);

  return ethereum.getProvider().getLogs(filter);
}

export function parseOracleRequestLog(log: ethers.providers.Log) {
  const contractInterface = new ethers.utils.Interface('<TODO>');
  return contractInterface.parseLog(log).args.values;
}
