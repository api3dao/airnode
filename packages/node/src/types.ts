import { OIS } from '@airnode/ois';
import { ethers } from 'ethers';

// ===========================================
// State
// ===========================================
export interface RequestParameters {
  [key: string]: string;
}

export enum RequestErrorCode {
  InvalidParameters = 1,
}

export interface Request {
  requestId: string;
  requester: string;
  endpointId: string | null;
  templateId: string | null;
  fulfillAddress: string;
  fulfillFunctionId: string;
  errorAddress: string;
  errorFunctionId: string;
  // TODO: can this be null?
  encodedParameters: string | null;
  parameters: RequestParameters;
  valid: boolean;
  errorCode?: RequestErrorCode;
}

export interface ProviderState {
  readonly config: ProviderConfig;
  readonly currentBlock: number;
  readonly gasPrice: ethers.BigNumber | null;
  readonly nonce: number | null;
  readonly requests: Request[];
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

export interface NodeSettings {
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
