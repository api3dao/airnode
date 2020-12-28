import { ethers } from 'ethers';
import { encode } from '@airnode/airnode-abi';
import { mocks } from '@airnode/protocol';
import { deriveProviderId, getDesignatedWallet } from '../utils';
import { FullRequest, RegularRequest, RequestsState as State, RequestType, ShortRequest } from '../../types';

export async function makeShortRequest(state: State, request: ShortRequest) {
  const requester = state.deployment.requesters.find((r) => r.id === request.requesterId);
  const { privateKey } = requester!;
  const signer = new ethers.Wallet(privateKey, state.provider);

  const clientAbi = mocks.MockAirnodeClient.abi;
  const clientAddress = state.deployment.clients[request.client];
  const client = new ethers.Contract(clientAddress, clientAbi, state.provider);
  const encodedParameters = encode(request.parameters);

  const templateId = state.deployment.apiProviders[request.apiProvider].templates[request.template].hash;

  await client.connect(signer).makeShortRequest(templateId, encodedParameters);
}

export async function makeRegularRequest(state: State, request: RegularRequest) {
  const requester = state.deployment.requesters.find((r) => r.id === request.requesterId);
  const { privateKey, requesterIndex } = requester!;
  const signer = new ethers.Wallet(privateKey, state.provider);

  const clientAbi = mocks.MockAirnodeClient.abi;
  const clientAddress = state.deployment.clients[request.client];
  const client = new ethers.Contract(clientAddress, clientAbi, state.provider);
  const encodedParameters = encode(request.parameters);

  const templateId = state.deployment.apiProviders[request.apiProvider].templates[request.template].hash;

  const { mnemonic } = state.config.apiProviders[request.apiProvider];
  const designatedWallet = getDesignatedWallet(mnemonic, requesterIndex, state.provider);

  await client
    .connect(signer)
    .makeRequest(
      templateId,
      requesterIndex,
      designatedWallet.address,
      client.address,
      client.interface.getSighash(`${request.fulfillFunctionName}(bytes32,uint256,bytes32)`),
      encodedParameters
    );
}

export async function makeFullRequest(state: State, request: FullRequest) {
  const requester = state.deployment.requesters.find((r) => r.id === request.requesterId);
  const { privateKey, requesterIndex } = requester!;
  const signer = new ethers.Wallet(privateKey, state.provider);

  const apiProviderAddress = state.deployment.apiProviders[request.apiProvider].address;
  const providerId = deriveProviderId(apiProviderAddress);
  const endpointId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string'], [request.endpoint]));

  const clientAbi = mocks.MockAirnodeClient.abi;
  const clientAddress = state.deployment.clients[request.client];
  const client = new ethers.Contract(clientAddress, clientAbi, state.provider);
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
