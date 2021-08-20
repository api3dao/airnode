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
    contracts: {
      AirnodeRrp: contracts.AirnodeRrp,
    },
    authorizers: [ethers.constants.AddressZero],
    id: '31337',
    type: 'evm',
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

export async function fetchAllLogs(
  provider: ethers.providers.JsonRpcProvider,
  address: string
  // NOTE: The return type could be typed better (e.g. unknown instead of any)
  // but doing so would make the tests less readable.
): Promise<AirnodeLogDescription<any>[]> {
  const filter: ethers.providers.Filter = {
    fromBlock: 0,
    address,
  };
  const rawLogs = await provider.getLogs(filter);
  return rawLogs.map((log) => parseAirnodeRrpLog(log));
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
