import * as path from 'path';
import * as fs from 'fs';
import { contractNames } from './contract-names';
const hre = require('hardhat');

const networkNames = fs
  .readdirSync(path.join('deployments'), { withFileTypes: true })
  .filter((item) => item.isDirectory())
  .map((item) => item.name);

const references: any = {};

for (const contractName of contractNames) {
  references[contractName] = {};

  for (const network of networkNames) {
    const deployment = JSON.parse(fs.readFileSync(path.join('deployments', network, `${contractName}.json`), 'utf8'));
    references[contractName]![hre.config.networks[network].chainId] = deployment.address;
  }
}

fs.writeFileSync(path.join('deployments', 'references.json'), JSON.stringify(references, null, 2) + '\n');
