import { OIS } from '@airnode/ois';
import { ethers } from 'ethers';

// ===========================================
// Options
// ===========================================

export interface CoordinatorOptions {
  readonly chains?: ChainConfig[];
}

// ===========================================
// State
// ===========================================
export interface ApiCallParameters {
  [key: string]: string;
}

export enum RequestErrorCode {
  InvalidRequestParameters = 1,
  InvalidTemplateParameters = 2,
  InvalidResponseParameters = 4,
  RequesterDataNotFound = 5,
  ReservedWalletIndex = 6,
  InsufficientBalance = 7,
  UnauthorizedClient = 8,
  TemplateNotFound = 9,
  AuthorizationNotFound = 10,
  ApiCallFailed = 11,
  ResponseValueNotFound = 12,
  UnableToMatchAggregatedCall = 13,
  UnableToCastResponse = 14,
  PendingWithdrawal = 15,
  UnknownEndpoint = 16,
  UnknownOIS = 17,
  FulfillTransactionFailed = 18,
}

export enum RequestStatus {
  Pending,
  Fulfilled,
  Ignored,
  Blocked,
  Errored,
}

export enum RequestType {
  ApiCall,
  WalletDesignation,
  Withdrawal,
}

export interface RequestMetadata {
  readonly blockNumber: number;
  readonly providerIndex: number;
  readonly transactionHash: string;
}

export type BaseRequest<T extends {}> = T & {
  readonly id: string;
  readonly errorCode?: RequestErrorCode;
  readonly metadata: RequestMetadata;
  readonly nonce?: number;
  readonly status: RequestStatus;
};

export interface RequesterData {
  readonly requesterId: string;
  readonly walletIndex: string;
  readonly walletAddress: string;
  readonly walletBalance: string;
  readonly walletMinimumBalance: string;
}

export type ClientRequest<T> = BaseRequest<T> & RequesterData;

export interface ApiCall {
  readonly encodedParameters: string;
  readonly endpointId: string | null;
  readonly errorAddress: string | null;
  readonly errorFunctionId: string | null;
  readonly fulfillAddress: string | null;
  readonly fulfillFunctionId: string | null;
  readonly parameters: ApiCallParameters;
  readonly providerId: string;
  readonly requesterAddress: string;
  readonly templateId: string | null;
  readonly response?: ApiCallResponse;
}

export interface ApiCallTemplate {
  readonly encodedParameters: string;
  readonly endpointId: string;
  readonly errorAddress: string;
  readonly errorFunctionId: string;
  readonly fulfillAddress: string;
  readonly fulfillFunctionId: string;
  readonly providerId: string;
  readonly templateId: string;
}

export interface WalletDesignation {
  readonly depositAmount: string;
  readonly providerId: string;
  readonly requesterId: string;
  readonly walletIndex: string;
}

export interface Withdrawal {
  readonly destinationAddress: string;
  readonly providerId: string;
  readonly requesterId: string;
}

export interface GroupedBaseRequests {
  readonly apiCalls: BaseRequest<ApiCall>[];
  readonly walletDesignations: BaseRequest<WalletDesignation>[];
  readonly withdrawals: BaseRequest<Withdrawal>[];
}

export interface GroupedRequests {
  readonly apiCalls: ClientRequest<ApiCall>[];
  readonly walletDesignations: BaseRequest<WalletDesignation>[];
  readonly withdrawals: ClientRequest<Withdrawal>[];
}

export interface WalletData {
  readonly address: string;
  readonly requests: GroupedRequests;
  readonly transactionCount: number;
}

export interface WalletDataByIndex {
  readonly [index: string]: WalletData;
}

export type ProviderSettings<T extends {}> = T & {
  readonly blockHistoryLimit: number;
  readonly chainId: number;
  readonly minConfirmations: number;
  readonly name: string;
  readonly url: string;
}

export type ProviderState<T extends {}> = T & {
  readonly currentBlock: number | null;
  readonly type: ChainType;
  readonly walletDataByIndex: WalletDataByIndex;
}

export interface CoordinatorState {
  readonly aggregatedApiCalls: AggregatedApiCall[];
  readonly providers: ProviderState<any>[];
}

// ===========================================
// EVM
// ===========================================
export interface EVMContracts {
  readonly Airnode: string;
  readonly Convenience: string;
  readonly GasPriceFeed: string;
}

export interface EVMSettings {
  readonly contracts: EVMContracts;
}

export interface EVMProvider {
  readonly gasPrice: ethers.BigNumber | null;
  readonly provider: ethers.providers.JsonRpcProvider;
  readonly settings: ProviderSettings<EVMSettings>;
}


// ===========================================
// API calls
// ===========================================
export interface AuthorizationByRequester {
  [id: string]: boolean;
}

export interface AuthorizationByEndpointId {
  [id: string]: AuthorizationByRequester;
}

export type AggregatedApiCallType = 'request' | 'flux' | 'aggregator';

export interface ApiCallResponse {
  value: string;
}

export interface ApiCallError {
  errorCode: number;
  message?: string;
}

export interface AggregatedApiCall {
  readonly id: string;
  readonly endpointId: string;
  readonly endpointName?: string;
  readonly oisTitle?: string;
  readonly parameters: ApiCallParameters;
  readonly providers: number[];
  readonly type: AggregatedApiCallType;
  readonly error?: ApiCallError;
  readonly response?: ApiCallResponse;
}

// ===========================================
// Events
// ===========================================
export interface LogWithMetadata {
  blockNumber: number;
  parsedLog: ethers.utils.LogDescription;
  transactionHash: string;
}

// ===========================================
// Transactions
// ===========================================
export interface TransactionOptions {
  gasPrice: number | ethers.BigNumber;
  provider?: ethers.providers.JsonRpcProvider;
}

export interface TransactionReceipt {
  id: string;
  transactionHash: string;
  type: RequestType;
}

// ===========================================
// Triggers
// ===========================================
export interface RequestTrigger {
  endpointId: string;
  endpointName: string;
  oisTitle: string;
}

export interface AggregatorTrigger {
  address: string;
  endpointName: string;
  oisTitle: string;
}

export interface Triggers {
  aggregator: AggregatorTrigger[];
  flux: AggregatorTrigger[];
  requests: RequestTrigger[];
}

// ===========================================
// Logging
// ===========================================
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface PendingLog {
  error?: Error;
  level: LogLevel;
  message: string;
}

// There are many places throughout the app where we need the context of the current
// (provider) state, mostly for logging purposes. It doesn't really make sense to
// pass the entire state down to these functions as it tightly couples them to the
// rest of the app.
//
// In order to get around this, the below tuple types are introduced that can return
// elements. The calling function is forced to decide how to handle the logs and
// error if one exists as ESLint will complain about unused variables. These types
// are purposefully tuples (over an object with 'logs' and 'error' properties) for
// this reason.
export type LogsData<T> = [PendingLog[], T];
export type LogsErrorData<T> = [PendingLog[], Error | null, T];

// ===========================================
// Config
// ===========================================
export type ChainType = 'evm'; // Add other blockchain types here;

export interface ChainContract {
  readonly address: string;
  readonly name: string;
}

export interface ChainProvider {
  readonly blockHistoryLimit?: number;
  readonly minConfirmations?: number;
  readonly name: string;
  readonly url: string;
}

export interface ChainConfig {
  readonly id: number;
  readonly contracts?: ChainContract[];
  readonly providers: ChainProvider[];
  readonly type: ChainType;
}

export type NodeCloudProvider = 'aws' | 'local:aws';

export interface NodeSettings {
  readonly chains: ChainConfig[];
  readonly cloudProvider: NodeCloudProvider;
  readonly nodeKey: string;
  readonly platformKey: string;
  readonly platformUrl: string;
  readonly providerId: string;
}

export interface Config {
  id: string;
  ois: OIS[];
  nodeSettings: NodeSettings;
  triggers: Triggers;
}
