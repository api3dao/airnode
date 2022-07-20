// Even though hardhat-etherscan claims to also verify the deployment locally,
// it doesn't expose that as a command. As a result, you can't verify deployments
// on chains at which there is no supported block explorer. This is an alternative
// that fetches the deployed bytecode from a chain and compares that with the output
// of the local compilation.

import { assert } from 'console';
import { logger } from '@api3/airnode-utilities';
import { contractNames } from './contract-names';
const hre = require('hardhat');

async function main() {
  for (const contractName of contractNames) {
    const deployment = await hre.deployments.get(contractName);
    const artifact = await hre.deployments.getArtifact(contractName);

    const creationTx = await hre.ethers.provider.getTransaction(deployment.transactionHash);
    // Verify that the creation tx hash belongs to the address
    assert(creationTx.creates === deployment.address);
    const creationData = creationTx.data;

    // Check if the calldata in the creation tx matches with the local build
    const constructor = artifact.abi.find((method: any) => method.type === 'constructor');
    if (constructor) {
      // If a constructor is defined, encode and add the constructor arguments to the contract bytecode
      const constructorArgumentTypes = constructor.inputs.map((input: any) => input.type);
      const encodedConstructorArguments = hre.ethers.utils.defaultAbiCoder.encode(
        constructorArgumentTypes,
        deployment.args
      );
      const generatedCreationData = hre.ethers.utils.solidityPack(
        ['bytes', 'bytes'],
        [artifact.bytecode, encodedConstructorArguments]
      );
      if (creationData !== generatedCreationData) {
        throw new Error(`${contractName} deployment on ${hre.network.name} DOES NOT match the local build!`);
      }
    } else {
      if (creationData !== artifact.bytecode) {
        throw new Error(`${contractName} deployment on ${hre.network.name} DOES NOT match the local build!`);
      }
    }
    logger.log(`${contractName} deployment on ${hre.network.name} matches the local build!`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.log(error);
    process.exit(1);
  });
