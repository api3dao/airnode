import '@nomiclabs/hardhat-ethers';
import { ethers } from 'hardhat';
import { encode } from '@airnode/airnode-abi';
import { providers } from 'ethers';
import requestConfig from '../config/evm-dev-requests.json';
import requesterConfig from '../config/evm-dev-requesters.json';

// Types
type RequestType = 'short' | 'regular' | 'full';

interface Request {
  client: string;
  requesterId: string;
  type: RequestType;
}

interface RequestParameter {
  name: string;
  type: string;
  value: string;
}

interface ShortRequest extends Request {
  templateId: string;
  parameters: RequestParameter[];
}

// General
let ethProvider: providers.JsonRpcProvider;

function getRequesterSigner(requesterId: string) {
  const requesterIndex = requesterConfig.requesters.findIndex((r) => r.id === requesterId);
  return ethProvider.getSigner(requesterIndex + 1);
}

async function makeShortRequest(request: ShortRequest) {
  const signer = getRequesterSigner(request.requesterId);
  const ABI = ['function makeShortRequest(bytes32 templateId, bytes calldata parameters) external'];

  // @ts-ignore TODO add types
  const clientAddress = requestConfig.clients[request.client];
  const client = new ethers.Contract(clientAddress, ABI, ethProvider);
  const encodedParameters = encode(request.parameters);

  await client.connect(signer).makeShortRequest(request.templateId, encodedParameters);
}

async function makeRequests() {
  for (const [index, request] of requestConfig.requests.entries()) {
    switch (request.type) {
      case 'short':
        await makeShortRequest(request as ShortRequest);
    }
    console.log(`Request #${index} submitted`);
    if (index + 1 < requestConfig.requests.length) {
      console.log('-------------------------------------------------------');
    }
  }
}

async function main() {
  ethProvider = ethers.provider;

  console.log('\n=======================REQUESTS=======================');
  await makeRequests();
  console.log('=======================REQUESTS=======================');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
