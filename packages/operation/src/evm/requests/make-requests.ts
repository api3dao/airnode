import { ethers } from 'ethers';
import { encode } from '@api3/airnode-abi';
import { mocks } from '@api3/protocol';
import { deriveEndpointId, deriveAirnodeId, getDesignatedWallet } from '../utils';
import { FullRequest, RegularRequest, RequestsState as State, RequestType, Withdrawal } from '../../types';

export async function makeRegularRequest(state: State, request: RegularRequest) {
  const requester = state.deployment.requesters.find((r) => r.id === request.requesterId);
  const { privateKey, address: requesterAddress } = requester!;
  const signer = new ethers.Wallet(privateKey, state.provider);

  const clientAddress = state.deployment.clients[request.client];
  const client = mocks.MockAirnodeRrpClientFactory.connect(clientAddress, state.provider);
  const encodedParameters = encode(request.parameters);

  const templateId = state.deployment.airnodes[request.airnode].templates[request.template].hash;

  const { mnemonic } = state.config.airnodes[request.airnode];
  const { address: designatedWalletAddress } = getDesignatedWallet(mnemonic, requesterAddress, state.provider);

  const tx = await client
    .connect(signer)
    .makeRequest(
      templateId,
      requesterAddress,
      designatedWalletAddress,
      client.address,
      client.interface.getSighash(`${request.fulfillFunctionName}(bytes32,uint256,bytes)`),
      encodedParameters
    );
  await tx.wait();
}

export async function makeFullRequest(state: State, request: FullRequest) {
  const requester = state.deployment.requesters.find((r) => r.id === request.requesterId);
  const { privateKey, address: requesterAddress } = requester!;
  const signer = new ethers.Wallet(privateKey, state.provider);

  const airnodeAddress = state.deployment.airnodes[request.airnode].masterWalletAddress;
  const airnodeId = deriveAirnodeId(airnodeAddress);
  const endpointId = deriveEndpointId(request.oisTitle, request.endpoint);

  const clientAddress = state.deployment.clients[request.client];
  const client = mocks.MockAirnodeRrpClientFactory.connect(clientAddress, state.provider);
  const encodedParameters = encode(request.parameters);

  const { mnemonic } = state.config.airnodes[request.airnode];
  const { address: designatedWalletAddress } = getDesignatedWallet(mnemonic, requesterAddress, state.provider);

  const tx = await client
    .connect(signer)
    .makeFullRequest(
      airnodeId,
      endpointId,
      requesterAddress,
      designatedWalletAddress,
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
  const { AirnodeRrp } = state.contracts;

  const requester = state.deployment.requesters.find((r) => r.id === request.requesterId);
  const { privateKey, address: requesterAddress } = requester!;
  const signer = new ethers.Wallet(privateKey, state.provider);

  const airnodeAddress = state.deployment.airnodes[request.airnode].masterWalletAddress;
  const airnodeId = deriveAirnodeId(airnodeAddress);

  const { mnemonic } = state.config.airnodes[request.airnode];
  const designatedWallet = getDesignatedWallet(mnemonic, requesterAddress, state.provider);
  const destination = getWithdrawalDestinationAddress(state, request);

  await AirnodeRrp.connect(signer).requestWithdrawal(airnodeId, designatedWallet.address, destination);
}

export async function makeRequests(state: State) {
  for (const request of state.config.requests) {
    switch (request.type as RequestType) {
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
