// Even though hardhat-etherscan claims to also verify the deployment locally,
// it doesn't expose that as a command. As a result, you can't verify deployments
// on chains at which there is no supported block explorer. This is an alternative
// that fetches the deployed bytecode from a chain and compares that with the output
// of the local compilation.

import { assert } from 'console';
import { logger } from '@api3/airnode-utilities';
import { contractNames } from './contract-names';
const hre = require('hardhat');

const verifyBytecode = (deployedData: string, localData: string, contractName: string) => {
  if (deployedData === localData) {
    logger.log(`✅  ${contractName} undeterministic deployment on ${hre.network.name} matches the local build!`);
    return true;
  }
  if (deployedData === hre.ethers.constants.HashZero + localData.slice(2)) {
    logger.log(`✅  ${contractName} deterministic deployment on ${hre.network.name} matches the local build!`);
    return true;
  }
  if (deployedData.slice(0, -106) === localData.slice(0, -106)) {
    logger.log(`✅  ${contractName} undeterministic deployment on ${hre.network.name} matches the local build!`);
    logger.log(`⚠️  ${contractName} metadata is different from onchain value`);
    return true;
  }
  if (deployedData.slice(0, -106) === hre.ethers.constants.HashZero + localData.slice(2).slice(0, -106)) {
    logger.log(`✅  ${contractName} deterministic deployment on ${hre.network.name} matches the local build!`);
    logger.log(`⚠️  ${contractName} metadata is different from onchain value`);
    return true;
  }
  return false;
};

async function main() {
  for (const contractName of contractNames) {
    const deployment = await hre.deployments.get(contractName);
    const artifact = await hre.deployments.getArtifact(contractName);

    const creationTx = await hre.ethers.provider.getTransaction(deployment.transactionHash);
    const deteministicDeploymentAddress = hre.ethers.utils.getCreate2Address(
      '0x4e59b44847b379578588920ca78fbf26c0b4956c',
      hre.ethers.constants.HashZero,
      hre.ethers.utils.keccak256(artifact.bytecode)
    );

    // Verify that the creation tx hash belongs to the address
    assert(creationTx.creates === deployment.address || deteministicDeploymentAddress);
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

      if (!verifyBytecode(creationData, generatedCreationData, contractName))
        throw new Error(`${contractName} deployment on ${hre.network.name} DOES NOT match the local build!`);
    } else {
      if (!verifyBytecode(creationData, artifact.bytecode, contractName))
        throw new Error(`${contractName} deployment on ${hre.network.name} DOES NOT match the local build!`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(error);
    process.exit(1);
  });
