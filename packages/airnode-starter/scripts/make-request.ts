import hre from 'hardhat';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-deploy';
import { encode } from '@api3/airnode-abi';

const getContract = async (name: string) => {
  const deployment = await hre.deployments.get(name);
  const contract = await hre.ethers.getContractAt(deployment.abi, deployment.address);

  return contract;
};

async function makeRequest(coinId: string): Promise<string> {
  const exampleRequester = await getContract('ExampleRequester');
  const airnodeRrp = await getContract('AirnodeRrp');

  // address airnode,
  // bytes32 endpointId,
  // address sponsor,
  // address sponsorWallet,
  // bytes calldata parameters
  const receipt = await exampleRequester.makeRequest(
    '0xDC78F7C97746E8155dCE57b29511257759bF4ACC', // TODO:
    '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353', // TODO: read from config JSON
    '0xb0A20975f540656E331e2331C6caEc608Ff254fc', // TODO:
    '0x55F65cCd03D7EE2A5a2031415efacd291023af4d', // TODO: derived using admin CLI
    encode([{ name: 'coinId', type: 'bytes32', value: coinId }])
  );
  return new Promise((resolve) =>
    hre.ethers.provider.once(receipt.hash, (tx) => {
      const parsedLog = airnodeRrp.interface.parseLog(tx.logs[0]);
      resolve(parsedLog.args.requestId);
    })
  );
}

async function fulfilled(requestId: string) {
  const airnodeRrp = await getContract('AirnodeRrp');
  return new Promise((resolve) =>
    hre.ethers.provider.once(airnodeRrp.filters.FulfilledRequest(null, requestId), resolve)
  );
}

async function main() {
  const coinLabel = 'Ethereum';
  const coinId = coinLabel.toLowerCase();

  console.log('Making the request...');
  const requestId = await makeRequest(coinId);
  console.log(`Made the request with ID ${requestId}.\nWaiting for it to be fulfilled...`);

  await fulfilled(requestId);
  console.log('Request fulfilled');

  const exampleRequester = await getContract('ExampleRequester');
  console.log(`${coinLabel} price is ${await exampleRequester.fulfilledData(requestId)} USD`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
