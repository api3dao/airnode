import { ethers } from 'ethers';
import { encode } from '@airnode/airnode-abi';
import { mocks } from '@airnode/protocol';
import { deriveEndpointId, deriveProviderId, getDesignatedWallet } from '../utils';
import {
  FullRequest,
  RegularRequest,
  RequestsState as State,
  RequestType,
  ShortRequest,
  Withdrawal,
} from '../../types';

export async function makeShortRequest(state: State, request: ShortRequest) {
  const requester = state.deployment.requesters.find((r) => r.id === request.requesterId);
  const { privateKey } = requester!;
  const signer = new ethers.Wallet(privateKey, state.provider);

  const clientAbi = mocks.MockAirnodeClient.abi;
  const clientAddress = state.deployment.clients[request.client];
  const client = new ethers.Contract(clientAddress, clientAbi, state.provider);
  const encodedParameters = encode(request.parameters);

  const templateId = state.deployment.apiProviders[request.apiProvider].templates[request.template].hash;

  const tx = await client.connect(signer).makeShortRequest(templateId, encodedParameters);
  await tx.wait();
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

  const tx = await client
    .connect(signer)
    .makeRequest(
      templateId,
      requesterIndex,
      designatedWallet.address,
      client.address,
      client.interface.getSighash(`${request.fulfillFunctionName}(bytes32,uint256,bytes)`),
      encodedParameters
    );
  await tx.wait();
}

export async function makeFullRequest(state: State, request: FullRequest) {
  const requester = state.deployment.requesters.find((r) => r.id === request.requesterId);
  const { privateKey, requesterIndex } = requester!;
  const signer = new ethers.Wallet(privateKey, state.provider);

  const apiProviderAddress = state.deployment.apiProviders[request.apiProvider].address;
  const providerId = deriveProviderId(apiProviderAddress);
  const endpointId = deriveEndpointId(request.oisTitle, request.endpoint);

  const clientAbi = mocks.MockAirnodeClient.abi;
  const clientAddress = state.deployment.clients[request.client];
  const client = new ethers.Contract(clientAddress, clientAbi, state.provider);
  const encodedParameters = encode(request.parameters);

  const { mnemonic } = state.config.apiProviders[request.apiProvider];
  const designatedWallet = getDesignatedWallet(mnemonic, requesterIndex, state.provider);

  const tx = await client
    .connect(signer)
    .makeFullRequest(
      providerId,
      endpointId,
      requesterIndex,
      designatedWallet.address,
      client.address,
      client.interface.getSighash(`${request.fulfillFunctionName}(bytes32,uint256,bytes)`),
      encodedParameters
    );
  await tx.wait();
}

function getWithdrawalDestinationAddress(state: State, request: Withdrawal): string {
  if (request.destination.startsWith('0x')) {
    return request.destination;
  }
  const requester = state.deployment.requesters.find((r) => r.id === request.requesterId);
  return requester!.address;
}

export async function makeWithdrawal(state: State, request: Withdrawal) {
  const { Airnode } = state.contracts;

  const requester = state.deployment.requesters.find((r) => r.id === request.requesterId);
  const { privateKey, requesterIndex } = requester!;
  const signer = new ethers.Wallet(privateKey, state.provider);

  const apiProviderAddress = state.deployment.apiProviders[request.apiProvider].address;
  const providerId = deriveProviderId(apiProviderAddress);

  const { mnemonic } = state.config.apiProviders[request.apiProvider];
  const designatedWallet = getDesignatedWallet(mnemonic, requesterIndex, state.provider);
  const destination = getWithdrawalDestinationAddress(state, request);

  await Airnode.connect(signer).requestWithdrawal(providerId, requesterIndex, designatedWallet.address, destination);
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

      case 'withdrawal':
        await makeWithdrawal(state, request as Withdrawal);
        break;
    }
  }
}
