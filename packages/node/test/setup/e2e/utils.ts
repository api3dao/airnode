import orderBy from 'lodash/orderBy';
import fs from 'fs';
import { ethers } from 'ethers';
import { AirnodeRrp } from '../../../src/evm/contracts';
import { ChainConfig } from '../../../src/types';

export interface Contracts {
  readonly AirnodeRrp: string;
}

export function buildChainConfig(contracts: Contracts): ChainConfig {
  return {
    airnodeAdmin: '0x5e0051B74bb4006480A1b548af9F1F0e0954F410',
    contracts: {
      AirnodeRrp: contracts.AirnodeRrp,
    },
    authorizers: [ethers.constants.AddressZero],
    id: '31337',
    type: 'evm',
    providerNames: ['EVM local'],
  };
}

export function buildProvider() {
  return new ethers.providers.StaticJsonRpcProvider('http://127.0.0.1:8545/');
}

export async function fetchAllLogs(provider: ethers.providers.JsonRpcProvider, address: string) {
  const airnodeRrpInterface = new ethers.utils.Interface(AirnodeRrp.ABI);
  const filter: ethers.providers.Filter = {
    fromBlock: 0,
    address,
  };
  const rawLogs = await provider.getLogs(filter);
  return rawLogs.map((log) => airnodeRrpInterface.parseLog(log));
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
