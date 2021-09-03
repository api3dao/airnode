import { OIS } from '@api3/ois';

// ===========================================
// Configuration file
// ===========================================

// TODO
// I'd say validator would be a better place to keep these types.
// It would make sense for validator to parse the configuration
// file, validate it and return a typed object

export type ChainType = 'evm';

export interface SecurityScheme {
  oisTitle: string;
  name: string;
  envName: string;
}

export type SecuritySchemes = SecurityScheme[];

export interface ChainProvider {
  chainType: ChainType;
  chainId: string;
  name: string;
  envName: string;
}

export type ChainProviders = ChainProvider[];

export interface Environment {
  securitySchemes: SecuritySchemes;
  chainProviders: ChainProviders;
}

export interface NodeSettings {
  nodeVersion: string;
  cloudProvider: 'aws';
  region: string;
  stage: string;
  logFormat?: 'json';
  logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
}

export interface Chain {
  id: string;
  type: ChainType;
  providerNames: string[];
  contracts: {
    AirnodeRrp: string;
  };
  authorizers: string[];
  blockHistoryLimit?: number;
  minConfirmations?: number;
  ignoreBlockedRequestsAfterBlocks?: number;
}

export type Chains = Chain[];

export interface Request {
  endpointId: string;
  oisTitle: string;
  endpointName: string;
}

export type Requests = Request[];

export interface Triggers {
  request: Requests;
}

export interface Configuration {
  ois: OIS;
  triggers: Triggers;
  chains: Chains;
  nodeSettings: NodeSettings;
  environment: Environment;
}

export type Configurations = Configuration[];

// ===========================================
// Receipt file
// ===========================================

export interface Receipt {
  airnodeAddress: string;
  airnodeAddressShort: string;
  xpub: string;
  config: Omit<Configuration, 'ois' | 'triggers' | 'environment'>;
}

export type Receipts = Receipt[];
