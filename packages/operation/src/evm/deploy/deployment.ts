import { AirnodeRrpArtifact, authorizers, mocks } from '@airnode/protocol';
import { ethers } from 'ethers';
import { DeployState as State } from '../../types';

export async function deployAirnodeRrp(state: State): Promise<State> {
  const AirnodeRrp = new ethers.ContractFactory(AirnodeRrpArtifact.abi, AirnodeRrpArtifact.bytecode, state.deployer);
  const airnodeRrp = await AirnodeRrp.deploy();
  await airnodeRrp.deployed();
  return { ...state, contracts: { ...state.contracts, AirnodeRrp: airnodeRrp } };
}

export async function deployClients(state: State): Promise<State> {
  const clientsByName: { [name: string]: ethers.Contract } = {};
  for (const mockName of Object.keys(mocks)) {
    const MockArtifact = mocks[mockName];
    const MockClient = new ethers.ContractFactory(MockArtifact.abi, MockArtifact.bytecode, state.deployer);
    const mockClient = await MockClient.deploy(state.contracts.AirnodeRrp!.address);
    await mockClient.deployed();
    clientsByName[mockName] = mockClient;
  }
  return { ...state, clientsByName };
}

export async function deployAuthorizers(state: State): Promise<State> {
  const authorizersByName: { [name: string]: string } = {};
  for (const authorizerName of Object.keys(authorizers)) {
    const AuthorizerArtifact = authorizers[authorizerName];
    const Authorizer = new ethers.ContractFactory(AuthorizerArtifact.abi, AuthorizerArtifact.bytecode, state.deployer);
    const authorizer = await Authorizer.deploy(state.contracts.AirnodeRrp!.address);
    await authorizer.deployed();
    authorizersByName[authorizerName] = authorizer.address;
  }
  // Special authorizer addresses
  authorizersByName.public = ethers.constants.AddressZero;
  return { ...state, authorizersByName };
}
