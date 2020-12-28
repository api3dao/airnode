import { AirnodeArtifact, ConvenienceArtifact, authorizers, mocks } from '@airnode/protocol';
import { ethers } from 'ethers';
import { DeployState as State } from '../../types';

export async function deployAirnode(state: State): Promise<State> {
  const Airnode = new ethers.ContractFactory(AirnodeArtifact.abi, AirnodeArtifact.bytecode, state.deployer);
  const airnode = await Airnode.deploy();
  await airnode.deployed();
  return { ...state, contracts: { ...state.contracts, Airnode: airnode } };
}

export async function deployConvenience(state: State): Promise<State> {
  const Convenience = new ethers.ContractFactory(ConvenienceArtifact.abi, ConvenienceArtifact.bytecode, state.deployer);
  const convenience = await Convenience.deploy(state.contracts.Airnode!.address);
  await convenience.deployed();
  return { ...state, contracts: { ...state.contracts, Convenience: convenience } };
}

export async function deployClients(state: State): Promise<State> {
  const clientsByName: { [name: string]: ethers.Contract } = {};
  for (const mockName of Object.keys(mocks)) {
    const MockArtifact = mocks[mockName];
    const MockClient = new ethers.ContractFactory(MockArtifact.abi, MockArtifact.bytecode, state.deployer);
    const mockClient = await MockClient.deploy(state.contracts.Airnode!.address);
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
    const authorizer = await Authorizer.deploy(state.contracts.Airnode!.address);
    await authorizer.deployed();
    authorizersByName[authorizerName] = authorizer.address;
  }
  // Special authorizer addresses
  authorizersByName.public = ethers.constants.AddressZero;
  return { ...state, authorizersByName };
}
