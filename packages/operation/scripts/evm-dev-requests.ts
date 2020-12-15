import '@nomiclabs/hardhat-ethers';
import { ethers } from 'hardhat';
import { encode } from '@airnode/airnode-abi';
// import { AirnodeABI, ConvenienceABI } from '@airnode/protocol';
import { providers } from 'ethers';
import config from '../config/evm-dev-requests.json';

// Types
type RequestType = 'short' | 'regular' | 'full';

interface Request {
  type: RequestType;
  client: string;
}

interface RequestParameter {
  name: string
  type: string;
  value: string;
}

interface ShortRequest extends Request {
  templateId: string;
  parameters: RequestParameter[];
}

// General
let deployer: providers.JsonRpcSigner;
let ethProvider: providers.JsonRpcProvider;

// Contracts
// let airnode: Contract;
// let convenience: Contract;
//
// function assignContracts() {
//   const airnodeAddress = config.addresses.Airnode;
//   airnode = new ethers.Contract(airnodeAddress, AirnodeABI, ethProvider);
//
//   const convenienceAddress = config.addresses.Convenience;
//   convenience = new ethers.Contract(convenienceAddress, ConvenienceABI, ethProvider);
// }

async function makeShortRequest(index: number, request: ShortRequest) {
  // @ts-ignore TODO add types
  const clientAddress = config.clients[request.client];
  const abi = [
    'function makeShortRequest(bytes32 templateId, bytes calldata parameters) external',
  ];
  const client = new ethers.Contract(clientAddress, abi, deployer);
  const encodedParameters = encode(request.parameters);
  console.log(request.templateId);
  console.log(encodedParameters);
  const tx = await client.makeShortRequest(request.templateId, encodedParameters);
  console.log(`Request ${index} submitted. Tx: ${tx}`);
}

async function makeRequests() {
  for (const [index, request] of config.requests.entries()) {
    switch (request.type) {
      case 'short':
        await makeShortRequest(index, request as ShortRequest);
    }
    if (index + 1 < config.requests.length) {
      console.log('-------------------------------------------------------');
    }
  }
}

async function main() {
  ethProvider = ethers.provider;
  deployer = ethProvider.getSigner(0);

  // console.log('Assigning contracts...');
  // assignContracts();

  console.log('Making requests...');
  makeRequests();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
