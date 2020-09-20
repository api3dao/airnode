import { OIS } from '@airnode/ois';
import { ethers } from 'ethers';

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
  [index: string]: WalletData;
}

export interface ProviderState {
  readonly config: ProviderConfig;
  readonly currentBlock: number | null;
  readonly index: number;
  readonly gasPrice: ethers.BigNumber | null;
  readonly provider: ethers.providers.JsonRpcProvider;
  readonly walletDataByIndex: WalletDataByIndex;
}

export interface CoordinatorState {
  readonly aggregatedApiCalls: AggregatedApiCall[];
  readonly providers: ProviderState[];
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

// There are many places where we need the context of the current state but
// don't want to pass the entire state down to these functions - mostly for
// logging. These types are introduced in order to reduce the amount of coupling
// between modules throughout the app.
//
// Making this type a tuple, also forces the user to handle logs and errors first.
// If it was an object ({ logs: [], error?: Error, data?: any }), then it's
// very easy to forgot to handle logs and errors
export type LogsData<T> = [PendingLog[], T];
export type LogsErrorData<T> = [PendingLog[], Error | null, T];

// ===========================================
// Config
// ===========================================
export interface ProviderConfig {
  chainId: number;
  name: string;
  url: string;
}

export type NodeCloudProvider = 'aws' | 'local:aws';

export interface NodeSettings {
  cloudProvider: NodeCloudProvider;
  nodeKey: string;
  platformKey: string;
  platformUrl: string;
  providerId: string;
  ethereumProviders: ProviderConfig[];
}

export interface Config {
  id: string;
  ois: OIS[];
  nodeSettings: NodeSettings;
  triggers: Triggers;
}
