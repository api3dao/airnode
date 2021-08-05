import { encode } from '@api3/airnode-abi';
import { mocks } from '@api3/protocol';
import { ethers } from 'ethers';
import { FullRequest, RequestsState as State, RequestType, TemplateRequest, Withdrawal } from '../../types';
import { deriveEndpointId, getDesignatedWallet } from '../utils';

export async function makeTemplateRequest(state: State, request: TemplateRequest) {
  const sponsor = state.deployment.sponsors.find((s) => s.id === request.sponsorId);
  const { privateKey, address: sponsorAddress } = sponsor!;
  const signer = new ethers.Wallet(privateKey, state.provider);

  const requesterAddress = state.deployment.requesters[request.requester];
  const requester = mocks.MockRrpRequesterFactory.connect(requesterAddress, state.provider);
  const encodedParameters = encode(request.parameters);

  const templateId = state.deployment.airnodes[request.airnode].templates[request.template].hash;

  const { mnemonic } = state.config.airnodes[request.airnode];
  const { address: designatedWalletAddress } = getDesignatedWallet(mnemonic, state.provider, sponsorAddress);

  const tx = await requester
    .connect(signer)
    .makeTemplateRequest(
      templateId,
      sponsorAddress,
      designatedWalletAddress,
      requester.address,
      requester.interface.getSighash(`${request.fulfillFunctionName}(bytes32,uint256,bytes)`),
      encodedParameters
    );
  await tx.wait();
}

export async function makeFullRequest(state: State, request: FullRequest) {
  const sponsor = state.deployment.sponsors.find((s) => s.id === request.sponsorId);
  const { privateKey, address: sponsorAddress } = sponsor!;
  const signer = new ethers.Wallet(privateKey, state.provider);

  const requestAddress = state.deployment.requesters[request.requester];
  const requester = mocks.MockRrpRequesterFactory.connect(requestAddress, state.provider);
  const encodedParameters = encode(request.parameters);

  const airnode = state.deployment.airnodes[request.airnode].airnodeWalletAddress;
  const endpointId = deriveEndpointId(request.oisTitle, request.endpoint);

  const { mnemonic } = state.config.airnodes[request.airnode];
  const { address: designatedWalletAddress } = getDesignatedWallet(mnemonic, state.provider, sponsorAddress);

  const tx = await requester
    .connect(signer)
    .makeFullRequest(
      airnode,
      endpointId,
      sponsorAddress,
      designatedWalletAddress,
      requester.address,
      requester.interface.getSighash(`${request.fulfillFunctionName}(bytes32,uint256,bytes)`),
      encodedParameters
    );
  await tx.wait();
}

function getWithdrawalDestinationAddress(state: State, request: Withdrawal): string {
  if (request.destination.startsWith('0x')) {
    return request.destination;
  }
  const sponsor = state.deployment.sponsors.find((s) => s.id === request.sponsorId);
  return sponsor!.address;
}

export async function makeWithdrawal(state: State, request: Withdrawal) {
  const sponsor = state.deployment.sponsors.find((s) => s.id === request.sponsorId);
  const { privateKey, address: sponsorAddress } = sponsor!;
  const signer = new ethers.Wallet(privateKey, state.provider);

  const airnode = state.deployment.airnodes[request.airnode].airnodeWalletAddress;

  const { mnemonic } = state.config.airnodes[request.airnode];
  const designatedWallet = getDesignatedWallet(mnemonic, state.provider, sponsorAddress);

  const destination = getWithdrawalDestinationAddress(state, request);

  const { AirnodeRrp } = state.contracts;

  await AirnodeRrp.connect(signer).requestWithdrawal(airnode, designatedWallet.address, destination);
}

export async function makeRequests(state: State) {
  for (const request of state.config.requests) {
    switch (request.type as RequestType) {
      case 'template':
        await makeTemplateRequest(state, request as TemplateRequest);
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
