import {
  AccessControlRegistryFactory,
  AirnodeRrpV0Factory,
  authorizers,
  mocks,
  erc721Mocks,
  RequesterAuthorizerWithErc721Factory,
} from '@api3/airnode-protocol';
import { ethers } from 'ethers';
import { DeployState as State } from '../../types';

export async function deployAirnodeRrp(state: State): Promise<State> {
  const AirnodeRrp = new AirnodeRrpV0Factory(state.deployer);
  const airnodeRrp = await AirnodeRrp.deploy();
  await airnodeRrp.deployed();
  return { ...state, contracts: { ...state.contracts, AirnodeRrp: airnodeRrp } };
}

export async function deployRequesters(state: State): Promise<State> {
  const requestersByName: { [name: string]: ethers.Contract } = {};
  // TODO: This uses generic mocks exported from Airnode protocol and assumes all of them are requesters
  for (const [mockName, MockArtifact] of Object.entries(mocks)) {
    const MockRequester = new MockArtifact(state.deployer);
    const mockRequester = await MockRequester.deploy(state.contracts.AirnodeRrp!.address);
    await mockRequester.deployed();
    requestersByName[mockName] = mockRequester as unknown as ethers.Contract;
  }
  return { ...state, requestersByName };
}

export async function deployAccessControlRegistry(state: State): Promise<State> {
  const AccessControlRegistry = new AccessControlRegistryFactory(state.deployer);
  const accessControlRegistry = await AccessControlRegistry.deploy();
  await accessControlRegistry.deployed();
  return { ...state, contracts: { ...state.contracts, AccessControlRegistry: accessControlRegistry } };
}

export async function deployAuthorizers(state: State): Promise<State> {
  const authorizersByName: { [name: string]: string } = {};
  for (const [authorizerName, AuthorizerArtifact] of Object.entries(authorizers)) {
    const Authorizer = new (AuthorizerArtifact as any)(state.deployer);
    const authorizer = await Authorizer.deploy(
      state.contracts.AccessControlRegistry!.address,
      `${authorizerName} admin`
    );
    await authorizer.deployed();
    authorizersByName[authorizerName] = authorizer.address;
  }
  return { ...state, authorizersByName };
}

export async function deployErc721s(state: State): Promise<State> {
  const erc721sByName: { [name: string]: ethers.Contract } = {};
  for (const [mockName, MockArtifact] of Object.entries(erc721Mocks)) {
    const MockErc721 = new MockArtifact(state.deployer);
    const mockErc721 = await MockErc721.deploy();
    await mockErc721.deployed();
    erc721sByName[mockName] = mockErc721 as unknown as ethers.Contract;
  }
  return { ...state, erc721sByName };
}

export async function deployRequesterAuthorizerWithErc721(state: State): Promise<State> {
  const RequesterAuthorizerWithErc721 = new RequesterAuthorizerWithErc721Factory(state.deployer);
  const requesterAuthorizerWithErc721 = await RequesterAuthorizerWithErc721.deploy(
    state.contracts.AccessControlRegistry!.address,
    'RequesterAuthorizerWithErc721 admin'
  );
  await requesterAuthorizerWithErc721.deployed();
  return { ...state, contracts: { ...state.contracts, RequesterAuthorizerWithErc721: requesterAuthorizerWithErc721 } };
}
