import { ethers } from 'ethers';
import { encode } from '@airnode/airnode-abi';
import { deriveProviderId, getDesignatedWallet } from '../utils';
import { FullRequest, RegularRequest, RequestsState as State, RequestType, ShortRequest } from '../../types';

const CLIENT_ABI = [
  'function makeShortRequest(bytes32 templateId, bytes calldata parameters)',
  'function makeRequest(bytes32 templateId, uint256 requesterIndex, address designatedWallet, address fulfillAddress, bytes4 fulfillFunctionId, bytes calldata parameters)',
  'function makeFullRequest(bytes32 providerId, bytes32 endpointId, uint256 requesterIndex, address designatedWallet, address fulfillAddress, bytes4 fulfillFunctionId, bytes calldata parameters)',
  'function fulfill(bytes32 requestId, uint256 statusCode, bytes32 data)',
  'function fulfillBytes(bytes32 requestId, uint256 statusCode, bytes calldata data)',
];

export async function makeShortRequest(state: State, request: ShortRequest) {
  const { privateKey } = state.deployment.requesters[request.requesterId];
  const signer = new ethers.Wallet(privateKey, state.provider);

  const clientAddress = state.deployment.clients[request.client];
  const client = new ethers.Contract(clientAddress, CLIENT_ABI, state.provider);
  const encodedParameters = encode(request.parameters);

  const templateAddress = state.deployment.apiProviders[request.apiProvider].templates[request.template];

  await client.connect(signer).makeShortRequest(templateAddress, encodedParameters);
}

export async function makeRegularRequest(state: State, request: RegularRequest) {
  const { privateKey, requesterIndex } = state.deployment.requesters[request.requesterId];
  const signer = new ethers.Wallet(privateKey, state.provider);

  const clientAddress = state.deployment.clients[request.client];
  const client = new ethers.Contract(clientAddress, CLIENT_ABI, state.provider);
  const encodedParameters = encode(request.parameters);

  const templateAddress = state.deployment.apiProviders[request.apiProvider].templates[request.template];

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

export async function makeFullRequest(state: State, request: FullRequest) {
  const { privateKey, requesterIndex } = state.deployment.requesters[request.requesterId];
  const signer = new ethers.Wallet(privateKey, state.provider);

  const apiProviderAddress = state.deployment.apiProviders[request.apiProvider].address;
  const providerId = deriveProviderId(apiProviderAddress);
  const endpointId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string'], [request.endpoint]));

  const clientAddress = state.deployment.clients[request.client];
  const client = new ethers.Contract(clientAddress, CLIENT_ABI, state.provider);
  const encodedParameters = encode(request.parameters);

  const { mnemonic } = state.config.apiProviders[request.apiProvider];
  const designatedWallet = getDesignatedWallet(mnemonic, requesterIndex, state.provider);

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

export async function makeRequests(state: State) {
  for (const request of state.config.requests) {
    switch (request.type as RequestType) {
      case 'short':
        await makeShortRequest(state, request as ShortRequest);
        break;

      case 'regular':
        await makeRegularRequest(state, request as RegularRequest);
        break;

      case 'full':
        await makeFullRequest(state, request as FullRequest);
        break;
    }
  }
}
