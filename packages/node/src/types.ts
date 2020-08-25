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
  InvalidOIS = 3,
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
}

export enum RequestStatus {
  Pending,
  TransactionInitiated,
  Fufilled,
  Errored,
  Blocked,
}

export interface RequestMetadata {
  readonly blockNumber: number;
  readonly transactionHash: string;
}

export type BaseRequest<T extends {}> = T & {
  readonly id: string;
  readonly errorCode?: RequestErrorCode;
  readonly logMetadata: RequestMetadata;
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
  readonly error?: ApiCallError;
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
  readonly depositAmount: ethers.BigNumber;
  readonly providerId: string;
  readonly requesterId: string;
  readonly walletIndex: ethers.BigNumber;
}

export interface Withdrawal {
  readonly destinationAddress: string;
  readonly providerId: string;
  readonly requesterId: string;
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
  readonly provider: ethers.providers.Provider;
  readonly xpub: string;
  readonly walletDataByIndex: WalletDataByIndex;
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

export interface CoordinatorState {
  readonly aggregatedApiCalls: AggregatedApiCall[];
  readonly providers: ProviderState[];
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
