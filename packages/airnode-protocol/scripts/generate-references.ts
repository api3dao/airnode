import * as path from 'path';
import * as fs from 'fs';
import { contractNames } from './contract-names';
const hre = require('hardhat');

const networkNames = fs
  .readdirSync(path.join('deployments'), { withFileTypes: true })
  .filter((item) => item.isDirectory())
  .map((item) => item.name);

const references: any = {};
references.chainNames = {};

for (const network of networkNames) {
  references.chainNames[hre.config.networks[network].chainId] = network;
}

for (const contractName of contractNames) {
  references[contractName] = {};

  for (const network of networkNames) {
    const deployment = JSON.parse(fs.readFileSync(path.join('deployments', network, `${contractName}.json`), 'utf8'));
    references[contractName]![hre.config.networks[network].chainId] = deployment.address;
  }
}

const networks = Object.entries(references.chainNames).reduce((acc, [chainId, name]) => {
  if (name === 'mainnet') return { ...acc, [parseInt(chainId)]: { chainId: parseInt(chainId), name: 'homestead' } };
  return { ...acc, [parseInt(chainId)]: { chainId: parseInt(chainId), name } };
}, {});
references.networks = networks;

fs.writeFileSync(path.join('deployments', 'references.json'), JSON.stringify(references, null, 2) + '\n');
