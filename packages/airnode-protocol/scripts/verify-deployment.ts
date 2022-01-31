// Even though hardhat-etherscan claims to also verify the deployment locally,
// it doesn't expose that as a command. As a result, you can't verify deployments
// on chains at which there is no supported block explorer. This is an alternative
// that fetches the deployed bytecode from a chain and compares that with the output
// of the local compilation.

import { assert } from 'console';
import * as path from 'path';
import * as fs from 'fs';
import * as ethers from 'ethers';

// From https://stackoverflow.com/a/20525865/14558682
// Gets a list of files in the directory recursively
function getFiles(dir: any, files_: any) {
  files_ = files_ || [];
  const files = fs.readdirSync(dir);
  for (const i in files) {
    const name = path.join(dir, files[i] as string);
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files_);
    } else {
      files_.push(name);
    }
  }
  return files_;
}

async function main() {
  const networks = ['mainnet', 'ropsten', 'rinkeby', 'goerli', 'kovan'];
  const contracts = ['AccessControlRegistry', 'AirnodeRrp', 'RequesterAuthorizerWithAirnode'];
  const credentials = JSON.parse(fs.readFileSync('credentials.json', 'utf8'));
  const artifactFileNames = getFiles(path.join('artifacts', 'contracts'), []);

  for (const network of networks) {
    const provider = new ethers.providers.JsonRpcProvider(credentials[network].providerUrl);
    for (const contract of contracts) {
      const deployment = JSON.parse(fs.readFileSync(path.join('deployments', network, `${contract}.json`), 'utf8'));
      const artifactFileName = artifactFileNames.find((artifactFileName: any) =>
        artifactFileName.endsWith(`${contract}.json`)
      );
      const artifact = JSON.parse(fs.readFileSync(artifactFileName, 'utf8'));

      const creationTx: any = await provider.getTransaction(deployment.transactionHash);
      const creationData = creationTx.data;
      // Make sure that the creation tx hash belongs to the address
      assert(creationTx.creates === deployment.address);

      let doesMatch = false;
      const constructor = artifact.abi.find((method: any) => method.type === 'constructor');
      if (constructor) {
        const constructorArgumentTypes = constructor.inputs.map((input: any) => input.type);
        const encodedConstructorArguments = ethers.utils.defaultAbiCoder.encode(
          constructorArgumentTypes,
          deployment.args
        );
        const generatedCreationData = artifact.bytecode + encodedConstructorArguments.substring(2);
        doesMatch = creationData === generatedCreationData;
      } else {
        doesMatch = creationData === artifact.bytecode;
      }
      console.log(`${contract} deployment on ${network} ${doesMatch ? 'matches' : 'DOES NOT match'} the local build!`);
    }
  }
}

main();
