import { OIS } from '@api3/airnode-ois';
import { ApiCredentials as AdapterApiCredentials } from '@api3/airnode-adapter';
import { BigNumber, ethers } from 'ethers';
import {
  MadeTemplateRequestEvent,
  MadeFullRequestEvent,
  FulfilledRequestEvent,
  FailedRequestEvent,
  RequestedWithdrawalEvent,
  FulfilledWithdrawalEvent,
} from '@api3/airnode-protocol';
import { AirnodeRrp } from './evm/contracts';

// ===========================================
// State
// ===========================================
export interface ApiCallParameters {
  readonly [key: string]: string;
}

// TODO: Replace these enums with string unions
// https://stackoverflow.com/questions/40275832/typescript-has-unions-so-are-enums-redundant
export enum RequestErrorMessage {
  RequestParameterDecodingFailed = 'Request parameter decoding failed',
  RequestIdInvalid = 'RequestId is invalid',
  TemplateNotFound = 'Template not found',
  TemplateParameterDecodingFailed = 'Template parameter decoding failed',
  TemplateIdInvalid = 'TemplateId is invalid',
  SponsorWalletInvalid = 'Sponsor wallet is invalid',
  AuthorizationNotFound = 'Authorization not found',
  Unauthorized = 'Unauthorized',
  PendingWithdrawal = 'Pending withdrawal',
  UnknownOIS = 'Unknown OIS',
  UnknownEndpointId = 'Unknown endpointId',
  UnknownEndpointName = 'Unknown endpoint name',
  NoMatchingAggregatedApiCall = 'No matching aggregated API call',
  ApiCallFailed = 'API call failed',
  ReservedParametersInvalid = 'Reserved parameters are invalid',
  FulfillTransactionFailed = 'Fulfill transaction failed',
  SponsorRequestLimitExceeded = 'Sponsor request limit exceeded',
}

export enum RequestStatus {
  // Request is valid and ready to be processed
  Pending = 'Pending',
  // Request was already processed by previous Airnode run (fulfilled or failed)
  // TODO: We should just have "Processed" status or just drop these immediately
  Fulfilled = 'Fulfilled',
  // The fulfillment for this request was submitted on chain during the current Airnode run
  // TODO: Not really needed for anything
  Submitted = 'Submitted',
  // Request is not valid and should be ignored (e.g. sponsor and sponsorWallet do not match).
  // Any request after the ignored request is processed as if this request didn't exist at all
  // TODO: We should just drop these requests immediately
  Ignored = 'Ignored',
  // Request is blocked if it is valid, but it cannot be processed in this Airnode run (e.g. chain limit or sponsor
  // wallet request limit exceeded). All other request from the same sponsor wallet should be deferred until this one
  // becomes unblocked
  Blocked = 'Blocked',
  // A request is errorred if it is valid, but cannot be fulfilled on chain
  // and thus should result in "fail" method called on AirnodeRrp.
  //
  // This can happen by multiple ways - request is unauthorized, API call fails, static call to fulfill fails
  // TODO: The problem with this status is that we use errorMessage to distinguish errored requests
  // and keeping this in sync is fragile - we can just drop this
  Errored = 'Errored',
}

export enum RequestType {
  ApiCall,
  Withdrawal,
}

export interface RequestMetadata {
  readonly address: string;
  readonly blockNumber: number;
  readonly currentBlock: number;
  readonly ignoreBlockedRequestsAfterBlocks: number;
  readonly transactionHash: string;
}

export interface RequestFulfillment {
  readonly hash: string;
}

export type Request<T extends {}> = T & {
  readonly id: string;
  readonly airnodeAddress: string;
  readonly sponsorAddress: string;
  readonly sponsorWalletAddress: string;
  readonly errorMessage?: string;
  readonly fulfillment?: RequestFulfillment;
  readonly metadata: RequestMetadata;
  readonly nonce?: number;
  readonly status: RequestStatus;
};

export type ApiCallType = 'template' | 'full';

// TODO: refactor these types such that there is user facing "ApiCall" which will get merged with
// template and internal type that is the result of those two being merged.
export interface ApiCall {
  readonly requestCount: string;
  readonly chainId: string;
  readonly requesterAddress: string;
  readonly templateId: string | null;
  readonly fulfillAddress: string;
  readonly fulfillFunctionId: string;
  readonly endpointId: string | null;
  readonly encodedParameters: string;
  readonly parameters: ApiCallParameters;
  readonly responseValue?: string;
  readonly signature?: string;
  readonly type: ApiCallType;
  readonly template?: ApiCallTemplate;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Withdrawal {}

export type AnyRequest = ApiCall | Withdrawal;

export interface ApiCallTemplate {
  readonly airnodeAddress: string;
  readonly endpointId: string;
  readonly encodedParameters: string;
  readonly id: string;
}

export interface ApiCallTemplatesById {
  readonly [id: string]: ApiCallTemplate;
}

export interface GroupedRequests {
  readonly apiCalls: Request<ApiCall>[];
  readonly withdrawals: Request<Withdrawal>[];
}

export interface SubmitRequest<T> {
  (airnodeRrp: AirnodeRrp, request: Request<T>, options: TransactionOptions): Promise<LogsErrorData<Request<T>>>;
}

export interface ProviderSettings extends CoordinatorSettings {
  readonly authorizers: string[];
  readonly blockHistoryLimit: number;
  readonly chainId: string;
  readonly chainType: ChainType;
  readonly chainOptions: ChainOptions;
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
  readonly stage: string;
  readonly cloudProvider: LocalOrCloudProvider;
}

export interface ProviderStates {
  readonly evm: ProviderState<EVMProviderState>[];
}

export interface CoordinatorState {
  readonly aggregatedApiCallsById: AggregatedApiCallsById;
  readonly config: Config;
  readonly providerStates: ProviderStates;
  readonly coordinatorId: string;
  readonly settings: CoordinatorSettings;
}

// ===========================================
// EVM specific
// ===========================================
export interface EVMContracts {
  // TODO: Rename to airnodeRrp for consistency
  readonly AirnodeRrp: string;
}

export interface EVMProviderState {
  readonly contracts: EVMContracts;
  readonly gasTarget: GasTarget | null;
  readonly provider: ethers.providers.JsonRpcProvider;
  readonly masterHDNode: ethers.utils.HDNode;
  readonly currentBlock: number | null;
}

export interface EVMProviderSponsorState extends EVMProviderState {
  readonly sponsorAddress: string;
}

export interface TransactionOptions {
  readonly gasTarget: GasTarget;
  readonly masterHDNode: ethers.utils.HDNode;
  readonly provider: ethers.providers.JsonRpcProvider;
}

export interface GasTarget {
  readonly maxPriorityFeePerGas?: BigNumber;
  readonly maxFeePerGas?: BigNumber;
  readonly gasPrice?: BigNumber;
}

// ===========================================
// API calls
// ===========================================
export interface AuthorizationByRequestId {
  readonly [requestId: string]: boolean;
}

export type ApiCallResponse = ApiCallSuccessResponse | ApiCallErrorResponse;

export interface ApiCallSuccessResponse {
  success: true;
  value: string;
  signature: string;
}

export interface ApiCallErrorResponse {
  success: false;
  errorMessage: string;
}

export type AggregatedApiCall = RegularAggregatedApiCall | TestingGatewayAggregatedApiCall;

export interface BaseAggregatedApiCall {
  id: string;
  airnodeAddress: string;
  endpointId: string;
  endpointName: string;
  oisTitle: string;
  parameters: ApiCallParameters;
  // TODO: Remove these values from this interface. They are added only after the API call is made
  // depending on the result. Current implementation causes ambiguity when these fields are
  // optional and when not.
  responseValue?: string;
  signature?: string;
  errorMessage?: string;
}

export interface RegularAggregatedApiCall extends BaseAggregatedApiCall {
  type: 'regular';
  sponsorAddress: string;
  requesterAddress: string;
  sponsorWalletAddress: string;
  chainId: string;
  requestType: ApiCallType;
  // TODO: This has way too many common properties with ApiCall
  metadata: RequestMetadata;
  requestCount: string;
  templateId: string | null;
  fulfillAddress: string;
  fulfillFunctionId: string;
  encodedParameters: string;
  template?: ApiCallTemplate;
}

export interface TestingGatewayAggregatedApiCall extends BaseAggregatedApiCall {
  type: 'testing-gateway';
}

// ===========================================
// Workers
// ===========================================
export interface WorkerOptions {
  readonly cloudProvider: LocalOrCloudProvider;
  readonly airnodeAddressShort: string;
  readonly stage: string;
}

export interface InitializeProviderPayload {
  readonly functionName: 'initializeProvider';
  readonly state: ProviderState<EVMProviderState>;
}

export interface ProcessTransactionsPayload {
  readonly functionName: 'processTransactions';
  readonly state: ProviderState<EVMProviderSponsorState>;
}

export interface CallApiPayload {
  readonly functionName: 'callApi';
  readonly aggregatedApiCall: AggregatedApiCall;
  readonly logOptions: LogOptions;
}

export type WorkerPayload = InitializeProviderPayload | ProcessTransactionsPayload | CallApiPayload;

export interface WorkerParameters extends WorkerOptions {
  readonly payload: WorkerPayload;
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
  readonly address: string;
  readonly blockNumber: number;
  readonly currentBlock: number;
  readonly ignoreBlockedRequestsAfterBlocks: number;
  readonly transactionHash: string;
}

export type AirnodeLogDescription<Event> = Event extends { readonly args: infer EventArgs }
  ? Omit<ethers.utils.LogDescription, 'args'> & { readonly args: EventArgs }
  : never;

export interface EVMMadeFullRequestLog extends EVMEventLogMetadata {
  readonly parsedLog: AirnodeLogDescription<MadeFullRequestEvent>;
}

export interface EVMMadeTemplateRequestLog extends EVMEventLogMetadata {
  readonly parsedLog: AirnodeLogDescription<MadeTemplateRequestEvent>;
}

export type EVMMadeRequestLog = EVMMadeTemplateRequestLog | EVMMadeFullRequestLog;

export interface EVMFulfilledRequestLog extends EVMEventLogMetadata {
  readonly parsedLog: AirnodeLogDescription<FulfilledRequestEvent> | AirnodeLogDescription<FailedRequestEvent>;
}

export interface EVMRequestedWithdrawalLog extends EVMEventLogMetadata {
  readonly parsedLog: AirnodeLogDescription<RequestedWithdrawalEvent>;
}

export interface EVMFulfilledWithdrawalLog extends EVMEventLogMetadata {
  readonly parsedLog: AirnodeLogDescription<FulfilledWithdrawalEvent>;
}

export type EVMEventLog =
  | EVMMadeRequestLog
  | EVMFulfilledRequestLog
  | EVMRequestedWithdrawalLog
  | EVMFulfilledWithdrawalLog;

// ===========================================
// Triggers
// ===========================================
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
export type LogsErrorData<T> = readonly [PendingLog[], Error | null, T | null];

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

export interface PriorityFee {
  readonly value: string;
  readonly unit?: 'wei' | 'kwei' | 'mwei' | 'gwei' | 'szabo' | 'finney' | 'ether';
}

export interface ChainOptions {
  readonly txType: 'legacy' | 'eip1559';
  readonly baseFeeMultiplier?: string;
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
