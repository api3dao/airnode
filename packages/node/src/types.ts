import { OIS } from '@airnode/ois';
import { ethers } from 'ethers';

// ===========================================
// State
// ===========================================
export interface ApiCallParameters {
  readonly [key: string]: string;
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
  InvalidTemplate = 19,
  InvalidDesignatedWallet = 20,
  InvalidRequestID = 21,
}

export enum RequestStatus {
  Pending = 'Pending',
  Fulfilled = 'Fulfilled',
  Ignored = 'Ignored',
  Blocked = 'Blocked',
  Errored = 'Errored',
}

export enum RequestType {
  ApiCall,
  Withdrawal,
}

export interface RequestMetadata {
  readonly blockNumber: number;
  readonly transactionHash: string;
}

export type ClientRequest<T extends {}> = T & {
  readonly designatedWallet: string | null;
  readonly id: string;
  readonly errorCode?: RequestErrorCode;
  readonly metadata: RequestMetadata;
  readonly nonce?: number;
  readonly requesterIndex: string | null;
  readonly status: RequestStatus;

  // TODO: protocol-overhaul remove these
  readonly requesterId: string;
  readonly walletIndex: string;
  readonly walletAddress: string;
  readonly walletBalance: string;
  readonly walletMinimumBalance: string;
};

export type ApiCallType = 'short' | 'regular' | 'full';

export interface ApiCall {
  readonly clientAddress: string;
  readonly encodedParameters: string;
  readonly endpointId: string | null;
  readonly fulfillAddress: string | null;
  readonly fulfillFunctionId: string | null;
  readonly parameters: ApiCallParameters;
  readonly providerId: string;
  readonly requestCount: string;
  readonly responseValue?: string;
  readonly templateId: string | null;
  readonly type: ApiCallType;

  // TODO: protocol-overhaul remove these
  readonly errorAddress: string | null;
  readonly errorFunctionId: string | null;
}

export interface ApiCallTemplate {
  readonly designatedWallet: string;
  readonly encodedParameters: string;
  readonly endpointId: string;
  readonly fulfillAddress: string;
  readonly fulfillFunctionId: string;
  readonly id: string;
  readonly providerId: string;
  readonly requesterIndex: string;
}

export interface Withdrawal {
  readonly destinationAddress: string;
  readonly providerId: string;
  readonly requesterIndex: string;
}

export interface GroupedRequests {
  readonly apiCalls: ClientRequest<ApiCall>[];
  readonly withdrawals: ClientRequest<Withdrawal>[];
}

export interface ProviderSettings {
  readonly adminAddressForCreatingProviderRecord?: string;
  readonly blockHistoryLimit: number;
  readonly chainId: number;
  readonly chainType: ChainType;
  readonly logFormat: LogFormat;
  readonly minConfirmations: number;
  readonly name: string;
  readonly providerId: string;
  readonly url: string;
  readonly xpub: string;
}

export type ProviderState<T extends {}> = T & {
  readonly config?: Config;
  readonly coordinatorId: string;
  readonly currentBlock: number | null;
  readonly requests: GroupedRequests;
  readonly settings: ProviderSettings;
  readonly transactionCountsByRequesterIndex: { [requesterIndex: string]: number };
};

export interface AggregatedApiCallsById {
  readonly [requestId: string]: AggregatedApiCall;
}

export interface CoordinatorState {
  readonly aggregatedApiCallsById: AggregatedApiCallsById;
  readonly config: Config;
  readonly id: string;
  readonly EVMProviders: ProviderState<EVMProviderState>[];
}

// ===========================================
// EVM specific
// ===========================================
export interface EVMContracts {
  readonly Airnode: string;
  readonly Convenience: string;
}

export interface EVMProviderState {
  readonly contracts: EVMContracts;
  readonly gasPrice: ethers.BigNumber | null;
  readonly provider: ethers.providers.JsonRpcProvider;
  readonly masterHDNode: ethers.utils.HDNode;
}

export interface TransactionOptions {
  readonly gasPrice: number | ethers.BigNumber;
  readonly provider: ethers.providers.JsonRpcProvider;
  readonly xpub: string;
}

// ===========================================
// API calls
// ===========================================
export interface AuthorizationByRequestId {
  readonly [requestId: string]: boolean;
}

export type AggregatedApiCallType = 'request' | 'flux' | 'aggregator';

export interface ApiCallResponse {
  readonly value?: string;
  readonly errorCode?: RequestErrorCode;
}

export interface AggregatedApiCall {
  readonly id: string;
  readonly endpointId: string;
  readonly endpointName?: string;
  readonly oisTitle?: string;
  readonly parameters: ApiCallParameters;
  readonly type: AggregatedApiCallType;
  readonly errorCode?: RequestErrorCode;
  readonly responseValue?: string;
}

// ===========================================
// Events
// ===========================================
export interface LogWithMetadata {
  readonly blockNumber: number;
  readonly parsedLog: ethers.utils.LogDescription;
  readonly transactionHash: string;
}

// ===========================================
// Transactions
// ===========================================
export interface TransactionReceipt {
  readonly id: string;
  readonly transactionHash: string;
  readonly type: RequestType;
}

// ===========================================
// Triggers
// ===========================================
export interface RequestTrigger {
  readonly endpointId: string;
  readonly endpointName: string;
  readonly oisTitle: string;
}

export interface Triggers {
  readonly requests: RequestTrigger[];
}

// ===========================================
// Logging
// ===========================================
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export type LogFormat = 'json' | 'plain';

export interface LogMetadata {
  readonly coordinatorId?: string;
  readonly chainId?: number;
  readonly chainType?: ChainType;
  readonly providerName?: string;
}

export interface LogOptions {
  readonly additional?: any;
  readonly error?: Error | null;
  readonly format: LogFormat;
  readonly meta: LogMetadata;
}

export interface PendingLog {
  readonly error?: Error;
  readonly level: LogLevel;
  readonly message: string;
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

export interface ChainContracts {
  readonly [name: string]: string;
}

export interface ChainProvider {
  readonly blockHistoryLimit?: number;
  readonly minConfirmations?: number;
  readonly name: string;
  readonly url: string;
}

export interface ChainConfig {
  readonly adminAddressForCreatingProviderRecord?: string;
  readonly contracts?: ChainContracts;
  readonly id: number;
  readonly providers: ChainProvider[];
  readonly type: ChainType;
}

export type NodeCloudProvider = 'aws' | 'local:aws';

export interface NodeSettings {
  readonly chains: ChainConfig[];
  readonly cloudProvider: NodeCloudProvider;
  readonly logFormat: LogFormat;
  readonly nodeKey: string;
  readonly platformKey: string;
  readonly platformUrl: string;
  readonly providerId: string;
}

export interface Config {
  readonly id: string;
  readonly ois: OIS[];
  readonly nodeSettings: NodeSettings;
  readonly triggers: Triggers;
}
