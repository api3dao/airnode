import { OIS } from '@api3/ois';
import { ApiCredentials as AdapterApiCredentials } from '@api3/adapter';
import { ethers } from 'ethers';
import { AirnodeRrp, TypedEventFilter } from '@api3/protocol';

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
  SponsorWalletInvalid = 6,
  AuthorizationNotFound = 7,
  Unauthorized = 8,
  PendingWithdrawal = 9,
  UnknownEndpointId = 10,
  UnknownOIS = 11,
  NoMatchingAggregatedCall = 12,
  ApiCallFailed = 13,
  ReservedParametersInvalid = 14,
  ResponseValueNotFound = 15,
  ResponseValueNotCastable = 16,
  FulfillTransactionFailed = 17,
}

export enum RequestStatus {
  Pending = 'Pending',
  Fulfilled = 'Fulfilled',
  Submitted = 'Submitted',
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

export interface RequestFulfillment {
  readonly hash: string;
}

export type ClientRequest<T extends {}> = T & {
  readonly sponsorWallet: string;
  readonly id: string;
  readonly errorCode?: RequestErrorCode;
  readonly fulfillment?: RequestFulfillment;
  readonly metadata: RequestMetadata;
  readonly nonce?: number;
  readonly sponsorAddress: string;
  readonly status: RequestStatus;
};

export type ApiCallType = 'regular' | 'full';

// TODO: refactor these types such that there is user facing "ApiCall" which will get merged with
// template and internal type that is the result of those two being merged.
export interface ApiCall {
  readonly airnodeAddress: string | null;
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
  readonly airnodeAddress: string;
  readonly encodedParameters: string;
  readonly endpointId: string;
  readonly id: string;
}

export interface Withdrawal {
  readonly airnodeAddress: string;
  readonly sponsorAddress: string;
}

export interface GroupedRequests {
  readonly apiCalls: ClientRequest<ApiCall>[];
  readonly withdrawals: ClientRequest<Withdrawal>[];
}

export interface ProviderSettings extends CoordinatorSettings {
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
  readonly id: string;
  readonly requests: GroupedRequests;
  readonly settings: ProviderSettings;
  readonly transactionCountsBySponsorAddress: { readonly [sponsorAddress: string]: number };
};

export interface AggregatedApiCallsById {
  readonly [requestId: string]: AggregatedApiCall;
}

export interface CoordinatorSettings {
  readonly airnodeAddress: string;
  readonly airnodeAddressShort: string;
  readonly logFormat: LogFormat;
  readonly logLevel: LogLevel;
  readonly region: string;
  readonly stage: string;
}

export interface ProviderStates {
  readonly evm: ProviderState<EVMProviderState>[];
}

export interface CoordinatorState {
  readonly aggregatedApiCallsById: AggregatedApiCallsById;
  readonly config: Config;
  readonly providerStates: ProviderStates;
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
  readonly currentBlock: number | null;
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

export interface ApiCallResponse {
  readonly value?: string | boolean;
  readonly errorCode?: RequestErrorCode;
}

export interface AggregatedApiCall {
  readonly id: string;
  readonly sponsorAddress: string;
  readonly airnodeAddress: string;
  readonly clientAddress: string;
  readonly sponsorWallet: string;
  readonly chainId: string;
  readonly endpointId: string;
  readonly endpointName?: string;
  readonly oisTitle?: string;
  readonly parameters: ApiCallParameters;
  readonly errorCode?: RequestErrorCode;
  readonly responseValue?: string;
}

// ===========================================
// Workers
// ===========================================
export interface WorkerOptions {
  readonly cloudProvider: NodeCloudProvider;
  readonly airnodeAddressShort: string;
  readonly region: string;
  readonly stage: string;
}

export type WorkerFunctionName = 'initializeProvider' | 'callApi' | 'processProviderRequests';

export interface WorkerParameters extends WorkerOptions {
  readonly functionName: WorkerFunctionName;
  readonly payload: any;
}

export interface WorkerResponse {
  readonly ok: boolean;
  readonly data?: any;
  readonly errorLog?: PendingLog;
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
// NOTE: Picking only the events used by node code
export type AirnodeRrpFilters = Pick<
  InstanceType<typeof AirnodeRrp>['filters'],
  | 'MadeTemplateRequest'
  | 'MadeFullRequest'
  | 'FulfilledRequest'
  | 'FailedRequest'
  | 'RequestedWithdrawal'
  | 'FulfilledWithdrawal'
>;
export type AirnodeRrpLog<T extends keyof AirnodeRrpFilters> = ExtractTypedEvent<ReturnType<AirnodeRrpFilters[T]>>;

export type AirnodeLogDescription<T> = Omit<ethers.utils.LogDescription, 'args'> & { readonly args: T };

export interface EVMMadeFullRequestLog extends EVMEventLogMetadata {
  readonly parsedLog: AirnodeLogDescription<AirnodeRrpLog<'MadeFullRequest'>>;
}

export interface EVMMadeTemplateRequestLog extends EVMEventLogMetadata {
  readonly parsedLog: AirnodeLogDescription<AirnodeRrpLog<'MadeTemplateRequest'>>;
}

export type EVMMadeRequestLog = EVMMadeTemplateRequestLog | EVMMadeFullRequestLog;

export interface EVMFulfilledRequestLog extends EVMEventLogMetadata {
  readonly parsedLog:
    | AirnodeLogDescription<AirnodeRrpLog<'FulfilledRequest'>>
    | AirnodeLogDescription<AirnodeRrpLog<'FailedRequest'>>;
}

export interface EVMRequestedWithdrawalLog extends EVMEventLogMetadata {
  readonly parsedLog: AirnodeLogDescription<AirnodeRrpLog<'RequestedWithdrawal'>>;
}

export interface EVMFulfilledWithdrawalLog extends EVMEventLogMetadata {
  readonly parsedLog: AirnodeLogDescription<AirnodeRrpLog<'FulfilledWithdrawal'>>;
}

export type EVMEventLog =
  | EVMMadeRequestLog
  | EVMFulfilledRequestLog
  | EVMRequestedWithdrawalLog
  | EVMFulfilledWithdrawalLog;

// ===========================================
// Transactions
// ===========================================
export interface TransactionReceipt {
  readonly id: string;
  readonly data?: ethers.Transaction;
  readonly error?: Error;
  readonly type: RequestType;
}

// ===========================================
// Triggers
// ===========================================
export interface RrpTrigger {
  readonly endpointId: string;
  readonly endpointName: string;
  readonly oisTitle: string;
}

export interface Triggers {
  readonly rrp: RrpTrigger[];
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
  readonly requestId?: string;
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
export type LogsData<T> = readonly [PendingLog[], T];
export type LogsErrorData<T> = readonly [PendingLog[], Error | null, T];

// ===========================================
// Config
// ===========================================
export type ChainType = 'evm'; // Add other blockchain types here;

export interface ChainContracts {
  readonly AirnodeRrp: string;
}

export interface Provider {
  readonly url: string;
}

export interface ChainConfig {
  readonly authorizers: string[];
  readonly blockHistoryLimit?: number;
  readonly contracts: ChainContracts;
  readonly id: string;
  readonly ignoreBlockedRequestsAfterBlocks?: number;
  readonly minConfirmations?: number;
  readonly type: ChainType;
  readonly providers: Record<string, Provider>;
}

export type NodeCloudProvider = 'local' | 'aws';

export interface HttpGateway {
  readonly enabled: boolean;
  readonly apiKey?: string;
}

export interface Heartbeat {
  readonly enabled: boolean;
  readonly apiKey?: string;
  readonly id?: string;
  readonly url?: string;
}

export interface NodeSettings {
  readonly airnodeWalletMnemonic: string;
  readonly heartbeat: Heartbeat;
  readonly httpGateway: HttpGateway;
  readonly airnodeAddressShort?: string;
  readonly cloudProvider: NodeCloudProvider;
  readonly logFormat: LogFormat;
  readonly logLevel: LogLevel;
  readonly nodeVersion: string;
  readonly region: string;
  readonly stage: string;
}

export interface ApiCredentials extends AdapterApiCredentials {
  readonly oisTitle: string;
}

export interface Config {
  readonly chains: ChainConfig[];
  readonly nodeSettings: NodeSettings;
  readonly ois: OIS[];
  readonly triggers: Triggers;
  readonly apiCredentials: ApiCredentials[];
}
