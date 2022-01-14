import fs from 'fs';
import orderBy from 'lodash/orderBy';
import { ethers } from 'ethers';
import { AirnodeLogDescription, ChainConfig } from '../../../src/types';
import { parseAirnodeRrpLog } from '../../../src/evm/requests/event-logs';

export interface Contracts {
  readonly AirnodeRrp: string;
}

export function buildChainConfig(contracts: Contracts): ChainConfig {
  return {
    maxConcurrency: 100,
    contracts: {
      AirnodeRrp: contracts.AirnodeRrp,
    },
    authorizers: [],
    id: '31337',
    type: 'evm',
    options: {
      txType: 'eip1559',
      baseFeeMultiplier: '2',
      priorityFee: {
        value: '3.12',
        unit: 'gwei',
      },
    },
    providers: {
      'EVM local': {
        url: 'http://127.0.0.1:8545/',
      },
    },
  };
}

export function buildProvider() {
  return new ethers.providers.StaticJsonRpcProvider('http://127.0.0.1:8545/');
}

export async function fetchAllLogs(provider: ethers.providers.JsonRpcProvider, address: string) {
  const filter: ethers.providers.Filter = {
    fromBlock: 0,
    address,
  };
  const rawLogs = await provider.getLogs(filter);
  return rawLogs.map(parseAirnodeRrpLog);
}

export async function fetchAllLogNames(provider: ethers.providers.JsonRpcProvider, address: string) {
  return (await fetchAllLogs(provider, address)).map(({ name }) => name);
}

export function filterLogsByName(logs: AirnodeLogDescription<any>[], name: string) {
  return logs.filter((log) => log.name === name);
}

// We want to use a separate account each time we deploy RRP. These accounts
// are assigned based on the feature file's index in the folder.
export function getDeployerIndex(fullFilePath: string) {
  const features = orderBy(
    fs.readdirSync('./test/e2e', { withFileTypes: true }).filter((item) => !item.isDirectory()),
    ['name']
  );

  const filename = fullFilePath.split(/[\\/]/).pop();

  return features.findIndex((feature) => feature.name === filename);
}
