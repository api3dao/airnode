import { ethers } from 'ethers';
import { encode } from '@airnode/airnode-abi';
import { deriveProviderId, getDesignatedWallet } from '../utils';
import {
  FullRequest,
  RegularRequest,
  RequestsState as State,
  ShortRequest
} from '../../types';

const CLIENT_ABI = [
  'function makeShortRequest(bytes32 templateId, bytes calldata parameters)',
  'function makeRequest(bytes32 templateId, uint256 requesterIndex, address designatedWallet, address fulfillAddress, bytes4 fulfillFunctionId, bytes calldata parameters)',
  'function makeFullRequest(bytes32 providerId, bytes32 endpointId, uint256 requesterIndex, address designatedWallet, address fulfillAddress, bytes4 fulfillFunctionId, bytes calldata parameters)',
  'function fulfill(bytes32 requestId, uint256 statusCode, bytes32 data)',
  'function fulfillBytes(bytes32 requestId, uint256 statusCode, bytes calldata data)',
];

async function makeShortRequest(state: State, request: ShortRequest) {
  const requesterIndex = state.config.requesters[request.requesterId];
  const signer = state.provider.getSigner(requesterIndex);

  const clientAddress = state.deployment.clients[request.client];
  const client = new ethers.Contract(clientAddress, CLIENT_ABI, state.provider);
  const encodedParameters = encode(request.parameters);

  const templateAddress = state.deployment.templates[request.apiProvider][request.template];

  await client.connect(signer).makeShortRequest(templateAddress, encodedParameters);
}

async function makeRegularRequest(state: State, request: RegularRequest) {
  const requesterIndex = state.config.requesters[request.requesterId];
  const signer = state.provider.getSigner(requesterIndex);

  const clientAddress = state.deployment.clients[request.client];
  const client = new ethers.Contract(clientAddress, CLIENT_ABI, state.provider);
  const encodedParameters = encode(request.parameters);

  const templateAddress = state.deployment.templates[request.apiProvider][request.template];

  const { mnemonic } = state.config.apiProviders[request.apiProvider];
  const designatedWallet = getDesignatedWallet(mnemonic, requesterIndex, state.provider);

  await client
    .connect(signer)
    .makeRequest(
      templateAddress,
      requesterIndex,
      designatedWallet.address,
      client.address,
      client.interface.getSighash(`${request.fulfillFunctionName}(bytes32,uint256,bytes32)`),
      encodedParameters
    );
}

async function makeFullRequest(state: State, request: FullRequest) {
  const requesterIndex = state.config.requesters[request.requesterId];
  const signer = state.provider.getSigner(requesterIndex);

  const apiProvider = state.config.apiProviders[request.apiProvider];
  const providerId = deriveProviderId(apiProvider);
  const endpointId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string'], [request.endpoint]));

  const clientAddress = config.addresses.clients[request.client];
  const client = new ethers.Contract(clientAddress, CLIENT_ABI, ethProvider);
  const encodedParameters = encode(request.parameters);

  // @ts-ignore TODO add types
  const designatedWallet = getDesignatedWallet(request.apiProvider, requesterIndex);

  await client
    .connect(signer)
    .makeFullRequest(
      providerId,
      endpointId,
      requesterIndex,
      designatedWallet.address,
      client.address,
      client.interface.getSighash(`${request.fulfillFunctionName}(bytes32,uint256,bytes32)`),
      encodedParameters
    );
}

async function makeRequests() {
  for (const [index, request] of config.requests.entries()) {
    switch (request.type as RequestType) {
      case 'short':
        await makeShortRequest(request as ShortRequest);
        break;

      case 'regular':
        await makeRegularRequest(request as RegularRequest);
        break;

      case 'full':
        await makeFullRequest(request as FullRequest);
        break;
    }

    console.log(`Request #${index} submitted`);
    if (index + 1 < config.requests.length) {
      console.log('-------------------------------------------------------');
    }
  }
}
