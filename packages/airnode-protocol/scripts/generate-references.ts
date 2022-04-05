import * as path from 'path';
import * as fs from 'fs';
import { logger } from '@api3/airnode-utilities';
import { contractNames } from './contract-names';
const hre = require('hardhat');

async function main() {
  const networks = fs
    .readdirSync(path.join('deployments'), { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => item.name);
  const references: any = {};
  for (const contractName of contractNames) {
    references[contractName] = {};
    for (const network of networks) {
      const deployment = JSON.parse(fs.readFileSync(path.join('deployments', network, `${contractName}.json`), 'utf8'));
      references[contractName]![hre.config.networks[network].chainId] = deployment.address;
    }
  }
  fs.writeFileSync(path.join('deployments', 'references.json'), JSON.stringify(references, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(error);
    process.exit(1);
  });

export { contractNames };
