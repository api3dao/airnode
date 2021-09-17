import { encode } from '@api3/airnode-abi';
import { mocks } from '@api3/protocol';
import { ethers } from 'ethers';
import { FullRequest, RequestsState as State, RequestType, TemplateRequest, Request } from '../../types';
import { deriveEndpointId, getSponsorWallet } from '../utils';

export async function makeTemplateRequest(state: State, request: TemplateRequest) {
  const sponsor = state.deployment.sponsors.find((s) => s.id === request.sponsorId);
  const { privateKey, address: sponsorAddress } = sponsor!;
  const signer = new ethers.Wallet(privateKey, state.provider);

  const requesterAddress = state.deployment.requesters[request.requester];
  const requester = mocks.MockRrpRequesterFactory.connect(requesterAddress, state.provider);
  const encodedParameters = encode(request.parameters);

  const templateId = state.deployment.airnodes[request.airnode].templates[request.template].hash;

  const { mnemonic } = state.config.airnodes[request.airnode];
  const { address: sponsorWalletAddress } = getSponsorWallet(mnemonic, state.provider, sponsorAddress);

  const tx = await requester
    .connect(signer)
    .makeTemplateRequest(
      templateId,
      sponsorAddress,
      sponsorWalletAddress,
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
  const { address: sponsorWalletAddress } = getSponsorWallet(mnemonic, state.provider, sponsorAddress);

  const tx = await requester
    .connect(signer)
    .makeFullRequest(
      airnode,
      endpointId,
      sponsorAddress,
      sponsorWalletAddress,
      requester.address,
      requester.interface.getSighash(`${request.fulfillFunctionName}(bytes32,uint256,bytes)`),
      encodedParameters
    );
  await tx.wait();
}

export async function makeWithdrawal(state: State, request: Request) {
  const sponsor = state.deployment.sponsors.find((s) => s.id === request.sponsorId);
  const { privateKey, address: sponsorAddress } = sponsor!;
  const signer = new ethers.Wallet(privateKey, state.provider);

  const airnode = state.deployment.airnodes[request.airnode].airnodeWalletAddress;

  const { mnemonic } = state.config.airnodes[request.airnode];
  const sponsorWallet = getSponsorWallet(mnemonic, state.provider, sponsorAddress);

  const { AirnodeRrp } = state.contracts;

  await AirnodeRrp.connect(signer).requestWithdrawal(airnode, sponsorWallet.address);
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
        await makeWithdrawal(state, request as Request);
        break;
    }
  }
}
