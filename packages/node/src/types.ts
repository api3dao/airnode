import { OIS } from '@airnode/ois';
import { ethers } from 'ethers';

// ===========================================
// State
// ===========================================
export interface ApiCallParameters {
  [key: string]: string;
}

export enum ApiRequestErrorCode {
  InvalidRequestParameters = 1,
  InvalidTemplateParameters = 2,
  RequesterDataNotFound = 3,
  InsufficientBalance = 4,
}

export interface ApiCallRequest {
  readonly requestId: string;
  readonly requesterId: string;
  readonly requesterAddress: string;
  readonly endpointId: string | null;
  readonly templateId: string | null;
  readonly fulfillAddress: string | null;
  readonly fulfillFunctionId: string | null;
  readonly errorAddress: string | null;
  readonly errorFunctionId: string | null;
  readonly encodedParameters: string;
  readonly parameters: ApiCallParameters;
  readonly valid: boolean;
  readonly errorCode?: ApiRequestErrorCode;
  readonly walletIndex: number;
  readonly walletAddress: string;
  readonly walletBalance: ethers.BigNumber;
  readonly walletMinimumBalance: ethers.BigNumber;
}

export interface ApiCallTemplate {
  readonly templateId: string;
  readonly endpointId: string;
  readonly providerId: string;
  readonly fulfillAddress: string;
  readonly fulfillFunctionId: string;
  readonly errorAddress: string;
  readonly errorFunctionId: string;
  readonly encodedParameters: string;
}

export interface WithdrawalRequest {
  readonly destination: string;
  readonly providerId: string;
  readonly requesterId: string;
  readonly withdrawRequestId: string;
}

export interface ProviderRequests {
  readonly apiCalls: ApiCallRequest[];
  readonly walletAuthorizations: WithdrawalRequest[];
  readonly withdrawals: any;
}

export interface ProviderState {
  readonly config: ProviderConfig;
  readonly currentBlock: number | null;
  readonly index: number;
  readonly gasPrice: ethers.BigNumber | null;
  readonly requests: ProviderRequests;
  readonly provider: ethers.providers.Provider;
}

export interface State {
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
