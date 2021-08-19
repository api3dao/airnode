import { AirnodeRrpFactory, authorizers, mocks } from '@api3/protocol';
import { ethers } from 'ethers';
import { DeployState as State } from '../../types';

export async function deployAirnodeRrp(state: State): Promise<State> {
  const AirnodeRrp = new AirnodeRrpFactory(state.deployer);
  const airnodeRrp = await AirnodeRrp.deploy();
  await airnodeRrp.deployed();
  return { ...state, contracts: { ...state.contracts, AirnodeRrp: airnodeRrp } };
}

export async function deployRequesters(state: State): Promise<State> {
  const requestersByName: { [name: string]: ethers.Contract } = {};
  for (const [mockName, MockArtifact] of Object.entries(mocks)) {
    const MockRequester = new MockArtifact(state.deployer);
    const mockRequester = await MockRequester.deploy(state.contracts.AirnodeRrp!.address);
    await mockRequester.deployed();
    requestersByName[mockName] = mockRequester as unknown as ethers.Contract;
  }
  return { ...state, requestersByName };
}

export async function deployAuthorizers(state: State): Promise<State> {
  const authorizersByName: { [name: string]: string } = {};
  for (const [authorizerName, AuthorizerArtifact] of Object.entries(authorizers)) {
    const Authorizer = new (AuthorizerArtifact as any)(state.deployer);
    const authorizer = await Authorizer.deploy(state.contracts.AirnodeRrp!.address);
    await authorizer.deployed();
    authorizersByName[authorizerName] = authorizer.address;
  }
  // Special authorizer addresses
  authorizersByName.public = ethers.constants.AddressZero;
  return { ...state, authorizersByName };
}
