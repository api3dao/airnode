import { OIS } from '@api3/airnode-ois';
import { BaseApiCredentials } from '@api3/airnode-adapter';

export interface Trigger {
  readonly endpointId: string;
  readonly endpointName: string;
  readonly oisTitle: string;
}

export interface Triggers {
  readonly rrp: Trigger[];
  // For now the attribute is optional, because http gateway is supported only on AWS.
  // TODO: Make this required once it is supported everywhere.
  http?: Trigger[];
}

// ===========================================
// Logging
// ===========================================
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export type LogFormat = 'json' | 'plain';

export type ChainType = 'evm'; // Add other blockchain types here;

export interface ChainContracts {
  readonly AirnodeRrp: string;
}

export interface Provider {
  readonly url: string;
}

export interface PriorityFee {
  readonly value: number;
  readonly unit?: 'wei' | 'kwei' | 'mwei' | 'gwei' | 'szabo' | 'finney' | 'ether';
}

export interface ChainOptions {
  readonly txType: 'legacy' | 'eip1559';
  readonly baseFeeMultiplier?: number;
  readonly priorityFee?: PriorityFee;
}

export interface ChainConfig {
  readonly authorizers: string[];
  readonly blockHistoryLimit?: number;
  readonly contracts: ChainContracts;
  readonly id: string;
  readonly ignoreBlockedRequestsAfterBlocks?: number;
  readonly minConfirmations?: number;
  readonly type: ChainType;
  readonly options: ChainOptions;
  readonly providers: Record<string, Provider>;
  readonly maxConcurrency: number;
}

export interface HttpGateway {
  readonly enabled: boolean;
  readonly apiKey?: string;
  readonly maxConcurrency?: number;
}

export interface Heartbeat {
  readonly enabled: boolean;
  readonly apiKey?: string;
  readonly id?: string;
  readonly url?: string;
}

export interface LocalProvider {
  readonly type: 'local';
}

export interface AwsCloudProvider {
  readonly type: 'aws';
  readonly region: string;
  readonly disableConcurrencyReservations: boolean;
}

export interface GcpCloudProvider {
  readonly type: 'gcp';
  readonly region: string;
  readonly projectId: string;
  readonly disableConcurrencyReservations: boolean;
}

export type CloudProvider = AwsCloudProvider | GcpCloudProvider;
export type LocalOrCloudProvider = LocalProvider | CloudProvider;

export interface NodeSettings {
  readonly airnodeWalletMnemonic: string;
  readonly heartbeat: Heartbeat;
  readonly httpGateway: HttpGateway;
  readonly airnodeAddressShort?: string;
  readonly stage: string;
  readonly cloudProvider: LocalOrCloudProvider;
  readonly logFormat: LogFormat;
  readonly logLevel: LogLevel;
  readonly nodeVersion: string;
  readonly skipValidation?: boolean;
}

export interface ApiCredentials extends BaseApiCredentials {
  readonly oisTitle: string;
}

// TODO: Test that the parse result from validator is compatible with this config
export interface Config {
  readonly chains: ChainConfig[];
  readonly nodeSettings: NodeSettings;
  readonly ois: OIS[];
  readonly triggers: Triggers;
  readonly apiCredentials: ApiCredentials[];
}
