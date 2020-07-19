import { OIS } from '@airnode/ois';
import { ethers } from 'ethers';

// ===========================================
// State
// ===========================================
export interface ApiRequestParameters {
  [key: string]: string;
}

export enum ApiRequestErrorCode {
  InvalidParameters = 1,
}

export interface ApiCallRequest {
  readonly requestId: string;
  readonly requester: string;
  readonly endpointId: string | null;
  readonly templateId: string | null;
  readonly fulfillAddress: string;
  readonly fulfillFunctionId: string;
  readonly errorAddress: string;
  readonly errorFunctionId: string;
  // TODO: can this be null?
  readonly encodedParameters: string | null;
  readonly parameters: ApiRequestParameters;
  readonly valid: boolean;
  readonly errorCode?: ApiRequestErrorCode;
}

export interface ProviderRequests {
  readonly apiCalls: ApiCallRequest[];
  // readonly walletWuthorizations: any;
  // readonly withdrawals: any;
}

export interface ProviderState {
  readonly config: ProviderConfig;
  readonly currentBlock: number;
  readonly gasPrice: ethers.BigNumber | null;
  readonly nonce: number | null;
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

export type NodeCloudProvider = 'aws' | 'aws-local';

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
