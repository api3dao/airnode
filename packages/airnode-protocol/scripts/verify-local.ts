// Even though hardhat-etherscan claims to also verify the deployment locally,
// it doesn't expose that as a command. As a result, you can't verify deployments
// on chains at which there is no supported block explorer. This is an alternative
// that fetches the deployed bytecode from a chain and compares that with the output
// of the local compilation.

import { assert } from 'console';
import { logger } from '@api3/airnode-utilities';
import { contractNames } from './contract-names';
const hre = require('hardhat');

const verifyDeployedBytecode = (deployedBytecode: string, generatedBytecode: string, contractName: string) => {
  if (deployedBytecode === generatedBytecode) {
    return true;
  }
  // The compiler appends by default the IPFS hash of the metadata file to the end of the bytecode (the last 53 bytes/106 char)
  // for reference: https://docs.soliditylang.org/en/v0.8.17/metadata.html#encoding-of-the-metadata-hash-in-the-bytecode
  else if (deployedBytecode.slice(0, -106) === generatedBytecode.slice(0, -106)) {
    logger.log(`⚠️  ${contractName} metadata is different from onchain value`);
    return true;
  } else {
    return false;
  }
};

async function main() {
  for (const contractName of contractNames) {
    const deployment = await hre.deployments.get(contractName);
    const artifact = await hre.deployments.getArtifact(contractName);
    const constructor = artifact.abi.find((method: any) => method.type === 'constructor');
    let generatedBytecode = artifact.bytecode;
    if (constructor) {
      // If a constructor is defined, encode and add the constructor arguments to the contract bytecode
      const constructorArgumentTypes = constructor.inputs.map((input: any) => input.type);
      const encodedConstructorArguments = hre.ethers.utils.defaultAbiCoder.encode(
        constructorArgumentTypes,
        deployment.args
      );
      generatedBytecode = hre.ethers.utils.solidityPack(
        ['bytes', 'bytes'],
        [artifact.bytecode, encodedConstructorArguments]
      );
    }

    const creationTx = await hre.ethers.provider.getTransaction(deployment.transactionHash);
    const creationData = creationTx.data;

    if (creationTx.creates) {
      // creationTx.creates is defined if the deployment is undeterministic
      // Verify that the creation tx hash belongs to the address
      assert(creationTx.creates === deployment.address);
      if (!verifyDeployedBytecode(creationData, generatedBytecode, contractName)) {
        throw new Error(
          `${contractName} undeterministic deployment on ${hre.network.name} DOES NOT match the local build!`
        );
      }
      logger.log(`✅  ${contractName} undeterministic deployment on ${hre.network.name} matches the local build!`);
    } else {
      const salt = hre.ethers.constants.HashZero;
      const deterministicDeploymentAddress = hre.ethers.utils.getCreate2Address(
        '0x4e59b44847b379578588920ca78fbf26c0b4956c', // default create2 factory address in hardhat
        salt,
        hre.ethers.utils.keccak256(artifact.bytecode)
      );
      assert(deterministicDeploymentAddress === deployment.address);
      generatedBytecode = hre.ethers.utils.hexConcat([salt, generatedBytecode]);
      if (!verifyDeployedBytecode(creationData, generatedBytecode, contractName)) {
        throw new Error(
          `${contractName} deterministic deployment on ${hre.network.name} DOES NOT match the local build!`
        );
      }
      logger.log(`✅  ${contractName} deterministic deployment on ${hre.network.name} matches the local build!`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(error);
    process.exit(1);
  });
