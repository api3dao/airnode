/* eslint-disable @typescript-eslint/indent */
// TODO: fix the indent conflict between Eslint and TS
import { OIS } from '@airnode/ois';
import { ethers } from 'ethers';
import { AirnodeRrp, TypedEventFilter } from '@airnode/protocol';

// ===========================================
// State
// ===========================================
export interface ApiCallParameters {
  readonly [key: string]: string;
}

export enum RequestErrorCode {
  RequestParameterDecodingFailed = 1,
  RequestInvalid = 2,
  TemplateNotFound = 3,
  TemplateParameterDecodingFailed = 4,
  TemplateInvalid = 5,
  DesignatedWalletInvalid = 6,
  AuthorizationNotFound = 7,
  Unauthorized = 8,
  PendingWithdrawal = 9,
  UnknownEndpointId = 10,
  UnknownOIS = 11,
  NoMatchingAggregatedCall = 12,
  ApiCallFailed = 13,
  ResponseParametersInvalid = 14,
  ResponseValueNotFound = 15,
  ResponseValueNotCastable = 16,
  FulfillTransactionFailed = 17,
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
  readonly currentBlock: number;
  readonly ignoreBlockedRequestsAfterBlocks: number;
  readonly transactionHash: string;
}

export type ClientRequest<T extends {}> = T & {
  readonly designatedWallet: string;
  readonly id: string;
  readonly errorCode?: RequestErrorCode;
  readonly metadata: RequestMetadata;
  readonly nonce?: number;
  readonly requesterIndex: string;
  readonly status: RequestStatus;
};

export type ApiCallType = 'regular' | 'full';

// TODO: refactor these types such that there is user facing "ApiCall" which will get merged with
// template and internal type that is the result of those two being merged.
export interface ApiCall {
  readonly airnodeId: string | null;
  readonly chainId: string;
  readonly clientAddress: string;
  readonly encodedParameters: string;
  readonly endpointId: string | null;
  readonly fulfillAddress: string;
  readonly fulfillFunctionId: string;
  readonly parameters: ApiCallParameters;
  readonly requestCount: string;
  readonly responseValue?: string;
  readonly templateId: string | null;
  readonly type: ApiCallType;
}

export interface ApiCallTemplate {
  readonly airnodeId: string;
  readonly encodedParameters: string;
  readonly endpointId: string;
  readonly id: string;
}

export interface Withdrawal {
  readonly airnodeId: string;
  readonly destinationAddress: string;
  readonly requesterIndex: string;
}

export interface GroupedRequests {
  readonly apiCalls: ClientRequest<ApiCall>[];
  readonly withdrawals: ClientRequest<Withdrawal>[];
}

export interface ProviderSettings extends CoordinatorSettings {
  readonly airnodeAdmin: string;
  readonly authorizers: string[];
  readonly blockHistoryLimit: number;
  readonly chainId: string;
  readonly chainType: ChainType;
  readonly ignoreBlockedRequestsAfterBlocks: number;
  readonly minConfirmations: number;
  readonly name: string;
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

export interface CoordinatorSettings {
  readonly airnodeId: string;
  readonly airnodeIdShort: string;
  readonly logFormat: LogFormat;
  readonly logLevel: LogLevel;
  readonly region: string;
  readonly stage: string;
}

export interface CoordinatorState {
  readonly aggregatedApiCallsById: AggregatedApiCallsById;
  readonly config: Config;
  readonly EVMProviders: ProviderState<EVMProviderState>[];
  readonly id: string;
  readonly settings: CoordinatorSettings;
}

// ===========================================
// EVM specific
// ===========================================
export interface EVMContracts {
  readonly AirnodeRrp: string;
}

export interface EVMProviderState {
  readonly contracts: EVMContracts;
  readonly gasPrice: ethers.BigNumber | null;
  readonly provider: ethers.providers.JsonRpcProvider;
  readonly masterHDNode: ethers.utils.HDNode;
}

export interface TransactionOptions {
  readonly gasPrice: number | ethers.BigNumber;
  readonly masterHDNode: ethers.utils.HDNode;
  readonly provider: ethers.providers.JsonRpcProvider;
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
// Workers
// ===========================================
export interface WorkerOptions {
  cloudProvider: NodeCloudProvider;
  airnodeIdShort: string;
  region: string;
  stage: string;
}

export type WorkerFunctionName = 'initializeProvider' | 'callApi' | 'processProviderRequests';

export interface WorkerParameters extends WorkerOptions {
  functionName: WorkerFunctionName;
  payload: any;
}

export interface WorkerResponse {
  ok: boolean;
  data?: any;
  errorLog?: PendingLog;
}

// ===========================================
// Events
// ===========================================
interface EVMEventLogMetadata {
  readonly blockNumber: number;
  readonly currentBlock: number;
  readonly ignoreBlockedRequestsAfterBlocks: number;
  readonly transactionHash: string;
}

// Maybe there will be less hacky way to obtain this in the future.
// See: https://github.com/ethereum-ts/TypeChain/issues/376
// NOTE: I am also ignoring the typed tupple and only extracting the typed event object.
type ExtractTypedEvent<T> = T extends TypedEventFilter<any, infer EventArgsObject> ? EventArgsObject : never;
export type AirnodeRrpEvents = Pick<
  InstanceType<typeof AirnodeRrp>['filters'],
  | 'ClientRequestCreated'
  | 'ClientFullRequestCreated'
  | 'ClientRequestFulfilled'
  | 'ClientRequestFailed'
  | 'WithdrawalRequested'
  | 'WithdrawalFulfilled'
>;
export type AirnodeRrpLog<T extends keyof AirnodeRrpEvents> = ExtractTypedEvent<ReturnType<AirnodeRrpEvents[T]>>;

export type AirnodeLogDescription<T> = Omit<ethers.utils.LogDescription, 'args'> & { args: T };

export interface EVMFullApiRequestCreatedLog extends EVMEventLogMetadata {
  parsedLog: AirnodeLogDescription<AirnodeRrpLog<'ClientFullRequestCreated'>>;
}

export interface EVMTemplateRequestCreatedLog extends EVMEventLogMetadata {
  parsedLog: AirnodeLogDescription<AirnodeRrpLog<'ClientRequestCreated'>>;
}

export type EVMRequestCreatedLog = EVMTemplateRequestCreatedLog | EVMFullApiRequestCreatedLog;

export interface EVMRequestFulfilledLog extends EVMEventLogMetadata {
  parsedLog:
    | AirnodeLogDescription<AirnodeRrpLog<'ClientRequestFulfilled'>>
    | AirnodeLogDescription<AirnodeRrpLog<'ClientRequestFailed'>>;
}

export interface EVMWithdrawalRequestLog extends EVMEventLogMetadata {
  parsedLog: AirnodeLogDescription<AirnodeRrpLog<'WithdrawalRequested'>>;
}

export interface EVMWithdrawalFulfilledLog extends EVMEventLogMetadata {
  parsedLog: AirnodeLogDescription<AirnodeRrpLog<'WithdrawalFulfilled'>>;
}

export type EVMEventLog =
  | EVMRequestCreatedLog
  | EVMRequestFulfilledLog
  | EVMWithdrawalRequestLog
  | EVMWithdrawalFulfilledLog;

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
  readonly request: RequestTrigger[];
}

// ===========================================
// Logging
// ===========================================
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export type LogFormat = 'json' | 'plain';

export interface LogMetadata {
  readonly coordinatorId?: string;
  readonly chainId?: string;
  readonly chainType?: ChainType;
  readonly providerName?: string;
}

export interface LogOptions {
  readonly additional?: any;
  readonly error?: Error | null;
  readonly format: LogFormat;
  readonly level: LogLevel;
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
  readonly AirnodeRrp: string;
}

export interface ChainConfig {
  readonly airnodeAdmin: string;
  readonly authorizers: string[];
  readonly blockHistoryLimit?: number;
  readonly contracts: ChainContracts;
  readonly id: string;
  readonly ignoreBlockedRequestsAfterBlocks?: number;
  readonly minConfirmations?: number;
  readonly providerNames: string[];
  readonly type: ChainType;
}

export type NodeCloudProvider = 'local' | 'aws';

export interface NodeSettings {
  readonly airnodeIdShort?: string;
  readonly cloudProvider: NodeCloudProvider;
  readonly logFormat: LogFormat;
  readonly logLevel: LogLevel;
  readonly nodeVersion: string;
  readonly region: string;
  readonly stage: string;
}

export interface SecuritySchemeEnvironmentConfig {
  readonly oisTitle: string;
  readonly name: string;
  readonly envName: string;
}

export interface ChainProviderEnvironmentConfig {
  readonly chainType: ChainType;
  readonly chainId: string;
  readonly name: string;
  readonly envName: string;
}

export interface EnvironmentConfig {
  readonly securitySchemes: SecuritySchemeEnvironmentConfig[];
  readonly chainProviders: ChainProviderEnvironmentConfig[];
}

export interface Config {
  readonly chains: ChainConfig[];
  readonly environment: EnvironmentConfig;
  readonly id: string;
  readonly nodeSettings: NodeSettings;
  readonly ois: OIS[];
  readonly triggers: Triggers;
}
