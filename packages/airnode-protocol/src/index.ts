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
  AccessControlRegistry__factory as AccessControlRegistryFactory,
  RequesterAuthorizerWithAirnode__factory as RequesterAuthorizerWithAirnodeFactory,
  RrpBeaconServer__factory as RrpBeaconServerFactory,
} from './contracts';
import AirnodeRrpDeploymentMainnet from '../deployments/mainnet/AirnodeRrp.json';
import AccessControlRegistryDeploymentMainnet from '../deployments/mainnet/AccessControlRegistry.json';
import RequesterAuthorizerWithAirnodeDeploymentMainnet from '../deployments/mainnet/RequesterAuthorizerWithAirnode.json';
import AirnodeRrpDeploymentRopsten from '../deployments/ropsten/AirnodeRrp.json';
import AccessControlRegistryDeploymentRopsten from '../deployments/ropsten/AccessControlRegistry.json';
import RequesterAuthorizerWithAirnodeDeploymentRopsten from '../deployments/ropsten/RequesterAuthorizerWithAirnode.json';
import AirnodeRrpDeploymentRinkeby from '../deployments/rinkeby/AirnodeRrp.json';
import AccessControlRegistryDeploymentRinkeby from '../deployments/rinkeby/AccessControlRegistry.json';
import RequesterAuthorizerWithAirnodeDeploymentRinkeby from '../deployments/rinkeby/RequesterAuthorizerWithAirnode.json';
import AirnodeRrpDeploymentGoerli from '../deployments/goerli/AirnodeRrp.json';
import AccessControlRegistryDeploymentGoerli from '../deployments/goerli/AccessControlRegistry.json';
import RequesterAuthorizerWithAirnodeDeploymentGoerli from '../deployments/goerli/RequesterAuthorizerWithAirnode.json';
import AirnodeRrpDeploymentKovan from '../deployments/kovan/AirnodeRrp.json';
import AccessControlRegistryDeploymentKovan from '../deployments/kovan/AccessControlRegistry.json';
import RequesterAuthorizerWithAirnodeDeploymentKovan from '../deployments/kovan/RequesterAuthorizerWithAirnode.json';

const AirnodeRrpAddresses: { [chainId: number]: string } = {
  1: AirnodeRrpDeploymentMainnet.receipt.contractAddress,
  3: AirnodeRrpDeploymentRopsten.receipt.contractAddress,
  4: AirnodeRrpDeploymentRinkeby.receipt.contractAddress,
  5: AirnodeRrpDeploymentGoerli.receipt.contractAddress,
  42: AirnodeRrpDeploymentKovan.receipt.contractAddress,
};
const AccessControlRegistryAddresses: { [chainId: number]: string } = {
  1: AccessControlRegistryDeploymentMainnet.receipt.contractAddress,
  3: AccessControlRegistryDeploymentRopsten.receipt.contractAddress,
  4: AccessControlRegistryDeploymentRinkeby.receipt.contractAddress,
  5: AccessControlRegistryDeploymentGoerli.receipt.contractAddress,
  42: AccessControlRegistryDeploymentKovan.receipt.contractAddress,
};
const RequesterAuthorizerWithAirnodeAddresses: { [chainId: number]: string } = {
  1: RequesterAuthorizerWithAirnodeDeploymentMainnet.receipt.contractAddress,
  3: RequesterAuthorizerWithAirnodeDeploymentRopsten.receipt.contractAddress,
  4: RequesterAuthorizerWithAirnodeDeploymentRinkeby.receipt.contractAddress,
  5: RequesterAuthorizerWithAirnodeDeploymentGoerli.receipt.contractAddress,
  42: RequesterAuthorizerWithAirnodeDeploymentKovan.receipt.contractAddress,
};
const mocks = {
  MockRrpRequesterFactory,
};
const authorizers = {
  RequesterAuthorizerWithAirnodeFactory,
};

export {
  AirnodeRrpAddresses,
  AccessControlRegistryAddresses,
  RequesterAuthorizerWithAirnodeAddresses,
  AirnodeRrpFactory,
  AccessControlRegistryFactory,
  RrpBeaconServerFactory,
  mocks,
  authorizers,
};

export type {
  AirnodeRrp,
  MockRrpRequester,
  AccessControlRegistry,
  RequesterAuthorizerWithAirnode,
  RrpBeaconServer,
} from './contracts';
export {
  MadeTemplateRequestEvent,
  MadeFullRequestEvent,
  FulfilledRequestEvent,
  FailedRequestEvent,
  RequestedWithdrawalEvent,
  FulfilledWithdrawalEvent,
} from './contracts/AirnodeRrp';
export { TypedEventFilter } from './contracts/commons';
