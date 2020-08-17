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
  AuthorizationNotFound = 9,
  ApiCallFailed = 10,
  ResponseValueNotFound = 11,
}

export type BaseRequest<T extends {}> = T & {
  readonly id: string;
  readonly valid: boolean;
  readonly errorCode?: RequestErrorCode;
};

export interface RequesterData {
  readonly requesterId: string;
  readonly walletIndex: number;
  readonly walletAddress: string;
  readonly walletBalance: ethers.BigNumber;
  readonly walletMinimumBalance: ethers.BigNumber;
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
  readonly walletIndex: number;
}

export interface Withdrawal {
  readonly destinationAddress: string;
  readonly providerId: string;
  readonly requesterId: string;
}

export interface GroupedProviderRequests {
  readonly apiCalls: ClientRequest<ApiCall>[];
  readonly walletDesignations: BaseRequest<WalletDesignation>[];
  readonly withdrawals: ClientRequest<Withdrawal>[];
}

export interface ProviderState {
  readonly config: ProviderConfig;
  readonly currentBlock: number | null;
  readonly index: number;
  readonly gasPrice: ethers.BigNumber | null;
  readonly requests: GroupedProviderRequests;
  readonly provider: ethers.providers.Provider;
  readonly transactionCountsByWalletIndex: { [index: string]: number };
  readonly xpub: string;
}

export type AggregatedApiCallType = 'request' | 'flux' | 'aggregator';

export interface SuccessfulApiCallResponse {
  value: string;
}

export interface ErroredApiCallResponse {
  errorCode: number;
  message?: string;
}

export interface AggregatedApiCall {
  readonly id: string;
  readonly endpointId: string;
  readonly parameters: ApiCallParameters;
  readonly providers: number[];
  readonly type: AggregatedApiCallType;
  readonly error?: ErroredApiCallResponse;
  readonly response?: SuccessfulApiCallResponse;
}

export interface CoordinatorState {
  readonly aggregatedApiCalls: AggregatedApiCall[];
  readonly providers: ProviderState[];
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
