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
  MockRrpRequester__factory as MockRrpRequesterFactory,
  AirnodeRrp__factory as AirnodeRrpFactory,
  AirnodeRequesterRrpAuthorizer__factory as AirnodeRequesterRrpAuthorizerFactory,
} from './contracts';
import AirnodeRrpArtifact from '../artifacts/contracts/rrp/AirnodeRrp.sol/AirnodeRrp.json';
import MockRrpRequesterArtifact from '../artifacts/contracts/rrp/requesters/mock/MockRrpRequester.sol/MockRrpRequester.json';
import AirnodeRrpDeploymentRinkeby from '../deployments/rinkeby/AirnodeRrp.json';
import AirnodeRequesterRrpAuthorizerRinkeby from '../deployments/rinkeby/AirnodeRequesterRrpAuthorizer.json';

const AirnodeRrpAddresses: { [chainId: number]: string } = { 4: AirnodeRrpDeploymentRinkeby.receipt.contractAddress };
const AirnodeRequesterRrpAuthorizerAddresses: { [chainId: number]: string } = {
  4: AirnodeRequesterRrpAuthorizerRinkeby.receipt.contractAddress,
};
const mocks = {
  MockRrpRequesterFactory,
};
// TODO:
const authorizers = {
  AirnodeRequesterRrpAuthorizerFactory,
};

// NOTE: For now, we only want to expose AirnodeRrp contract (and it's mock)
export { AirnodeRrpAddresses, AirnodeRequesterRrpAuthorizerAddresses, AirnodeRrpFactory, mocks, authorizers };
// Export the artifacts for API consumers using web3
export { AirnodeRrpArtifact, MockRrpRequesterArtifact };
export type { AirnodeRrp, MockRrpRequester, TypedEventFilter, AirnodeRequesterRrpAuthorizer } from './contracts';
