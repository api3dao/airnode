/**
 * This package is integrated with https://github.com/ethereum-ts/TypeChain which generates TS
 * bindings and wrappers for ethers wallet (version 5). TypeChain generates two important pieces for
 * each solidity contract:
 *  1) Factories - (e.g. AirnodeRrpFactory) are used to connect to ethers Signer and deploy the
 *     contract (or just connect to an already deployed contract instance). You will get a strongly
 *     typed contract instance in return.
 *  2) Typed contracts - These are returned after deployed via contract Factory. It allows you to
 *     call functions, mapping and transactions in type safe manner.
 *
 * The generated code "value exports" the factories, but "type exports" the contracts.
 */
import {
  MockAirnodeRrpRequester__factory as MockAirnodeRrpRequesterFactory,
  AirnodeRrp__factory as AirnodeRrpFactory,
} from './contracts';
import AirnodeRrpArtifact from '../artifacts/contracts/AirnodeRrp.sol/AirnodeRrp.json';
import MockAirnodeRrpRequesterArtifact from '../artifacts/contracts/requesters/mock/MockAirnodeRrpRequester.sol/MockAirnodeRrpRequester.json';
import AirnodeRrpDeploymentRopsten from '../deployments/ropsten/AirnodeRrp.json';

const AirnodeRrpAddresses: { [chainId: number]: string } = { 3: AirnodeRrpDeploymentRopsten.receipt.contractAddress };
const mocks = {
  MockAirnodeRrpRequesterFactory,
};
// TODO:
const authorizers = {};

// NOTE: For now, we only want to expose AirnodeRrp contract (and it's mock)
export { AirnodeRrpAddresses, AirnodeRrpFactory, mocks, authorizers };
// Export the artifacts for API consumers using web3
export { AirnodeRrpArtifact, MockAirnodeRrpRequesterArtifact };
export type { AirnodeRrp, MockAirnodeRrpRequester, TypedEventFilter } from './contracts';
