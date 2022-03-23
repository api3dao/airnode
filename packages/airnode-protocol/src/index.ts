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
import references from '../deployments/references.json';

const AirnodeRrpAddresses: { [chainId: number]: string } = references.AirnodeRrp;
const AccessControlRegistryAddresses: { [chainId: number]: string } = references.AccessControlRegistry;
const RequesterAuthorizerWithAirnodeAddresses: { [chainId: number]: string } =
  references.RequesterAuthorizerWithAirnode;

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
