import { ethers } from 'ethers';
import {
  MadeTemplateRequestEvent,
  MadeFullRequestEvent,
  FulfilledRequestEvent,
  FailedRequestEvent,
  RequestedWithdrawalEvent,
  FulfilledWithdrawalEvent,
} from '@api3/airnode-protocol';
import { PendingLog, LogFormat, LogLevel, LogOptions, GasTarget } from '@api3/airnode-utilities';
import { z } from 'zod';
import {
  Config,
  ChainOptions,
  ChainType,
  LocalOrCloudProvider,
  Amount,
  ChainAuthorizers,
  ChainAuthorizations,
} from './config';
import { apiCallParametersSchema } from './validation';
import { AirnodeRrpV0 } from './evm/contracts';

// ===========================================
// State
// ===========================================
export type ApiCallParameters = z.infer<typeof apiCallParametersSchema>;

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
  GasEstimationFailed = 'Gas estimation failed',
  SponsorRequestLimitExceeded = 'Sponsor request limit exceeded',
}

export interface UpdatedRequests<T> {
  readonly logs: PendingLog[];
  readonly requests: Request<T>[];
}

export enum RequestType {
  ApiCall,
  Withdrawal,
}

export interface RequestMetadata {
  readonly address: string;
  readonly blockNumber: number;
  readonly currentBlock: number;
  readonly minConfirmations: number;
  readonly transactionHash: string;
  readonly logIndex: number;
}

export interface RequestFulfillment {
  readonly hash: string;
}

export type Request<T> = T & {
  readonly id: string;
  readonly airnodeAddress: string;
  readonly sponsorAddress: string;
  readonly sponsorWalletAddress: string;
  readonly errorMessage?: string;
  readonly fulfillment?: RequestFulfillment;
  readonly metadata: RequestMetadata;
  readonly nonce?: number;
  readonly chainId: string;
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
  readonly type: ApiCallType;
  readonly template?: ApiCallTemplate;
}

export type ApiCallWithResponse = ApiCall & RegularApiCallResponse;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Withdrawal {
  readonly chainId: string;
}

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

export type ApiCallTemplateWithoutId = Omit<ApiCallTemplate, 'id'>;

export interface GroupedRequests {
  readonly apiCalls: Request<ApiCall>[];
  readonly withdrawals: Request<Withdrawal>[];
}

export interface SubmitRequest<T> {
  (airnodeRrp: AirnodeRrpV0, request: Request<T>, options: TransactionOptions): Promise<LogsErrorData<Request<T>>>;
}

export interface ProviderSettings extends CoordinatorSettings {
  readonly authorizers: ChainAuthorizers;
  readonly authorizations: ChainAuthorizations;
  readonly blockHistoryLimit: number;
  readonly chainId: string;
  readonly chainType: ChainType;
  readonly chainOptions: ChainOptions;
  readonly minConfirmations: number;
  readonly mayOverrideMinConfirmations: boolean;
  readonly name: string;
  readonly url: string;
  readonly xpub: string;
}

export type ProviderState<T> = T & {
  readonly config?: Config;
  readonly coordinatorId: string;
  readonly id: string;
  readonly requests: GroupedRequests;
  readonly settings: ProviderSettings;
  readonly transactionCountsBySponsorAddress: { readonly [sponsorAddress: string]: number };
};

export interface RegularAggregatedApiCallsById {
  readonly [requestId: string]: RegularAggregatedApiCall;
}

export interface RegularAggregatedApiCallsWithResponseById {
  readonly [requestId: string]: RegularAggregatedApiCallWithResponse;
}

export interface CoordinatorSettings {
  readonly airnodeAddress: string;
  readonly deploymentId: string;
  readonly logFormat: LogFormat;
  readonly logLevel: LogLevel;
  readonly stage: string;
  readonly cloudProvider: LocalOrCloudProvider;
}

export interface ProviderStates {
  readonly evm: ProviderState<EVMProviderState>[];
}

export interface CoordinatorState {
  readonly aggregatedApiCallsById: RegularAggregatedApiCallsById;
  readonly config: Config;
  readonly providerStates: ProviderStates;
  readonly coordinatorId: string;
  readonly settings: CoordinatorSettings;
}

export interface CoordinatorStateWithApiResponses extends CoordinatorState {
  aggregatedApiCallsById: RegularAggregatedApiCallsWithResponseById;
}

// ===========================================
// EVM specific
// ===========================================
export interface EVMContracts {
  // TODO: Rename to airnodeRrp for consistency
  readonly AirnodeRrp: string;
  readonly AirnodeRrpDryRun?: string;
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
  readonly contracts: EVMContracts;
  readonly masterHDNode: ethers.utils.HDNode;
  readonly provider: ethers.providers.JsonRpcProvider;
  readonly withdrawalRemainder?: Amount;
}

// ===========================================
// API calls
// ===========================================
export interface AuthorizationByRequestId {
  readonly [requestId: string]: boolean;
}

export type RegularApiCallResponse = RegularApiCallSuccessResponse | ApiCallErrorResponse;
export type HttpGatewayApiCallResponse =
  | HttpGatewayApiCallSuccessResponse
  | HttpGatewayApiCallPartialResponse
  | ApiCallErrorResponse;
export type HttpSignedDataApiCallResponse = HttpSignedDataApiCallSuccessResponse | ApiCallErrorResponse;

export type ApiCallResponse = RegularApiCallResponse | HttpGatewayApiCallResponse | HttpSignedDataApiCallResponse;
export interface RegularApiCallSuccessResponse {
  success: true;
  data: { encodedValue: string; signature: string };
  reservedParameterOverrides?: {
    gasPrice?: string;
  };
}

export interface HttpGatewayApiCallSuccessResponse {
  success: true;
  data: { values: unknown[]; rawValue: unknown; encodedValue: string };
}

export interface HttpGatewayApiCallPartialResponse {
  success: true;
  errorMessage: string;
  data: unknown;
}

export interface HttpSignedDataApiCallSuccessResponse {
  success: true;
  data: { timestamp: string; encodedValue: string; signature: string };
}

export interface SignOevDataResponse {
  success: true;
  data: string[]; // Signatures for the beacons of this Airnode in order they were provided
}

export interface ApiCallErrorResponse {
  success: false;
  errorMessage: string;
  reservedParameterOverrides?: {
    gasPrice?: string;
  };
}

export type AggregatedApiCall = RegularAggregatedApiCall | HttpSignedDataAggregatedApiCall;

export interface BaseAggregatedApiCall {
  endpointName: string;
  oisTitle: string;
  parameters: ApiCallParameters;
  // This property is defined in case there is an error and this API call cannot be processed
  errorMessage?: string;
}

export interface RegularAggregatedApiCall extends BaseAggregatedApiCall {
  id: string;
  airnodeAddress: string;
  endpointId: string;
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
  cacheResponses?: boolean;
}

export type RegularAggregatedApiCallWithResponse = RegularAggregatedApiCall & RegularApiCallResponse;

export interface HttpSignedDataAggregatedApiCall extends BaseAggregatedApiCall {
  id: string;
  endpointId: string;
  templateId: string;
  template: ApiCallTemplate;
}

export type HttpApiCallConfig = Pick<Config, 'ois' | 'apiCredentials'>;

export type RegularApiCallConfig = HttpApiCallConfig &
  Pick<Config, 'chains'> & {
    nodeSettings: Pick<Config['nodeSettings'], 'airnodeWalletMnemonic'>;
  };

export type ApiCallConfig = RegularApiCallConfig | HttpApiCallConfig;

export interface RegularApiCallPayload {
  type: 'regular';
  readonly config: RegularApiCallConfig;
  readonly aggregatedApiCall: RegularAggregatedApiCall;
}

export interface HttpApiCallPayload {
  type: 'http-gateway';
  readonly config: HttpApiCallConfig;
  readonly aggregatedApiCall: BaseAggregatedApiCall;
}

export interface HttpSignedApiCallPayload {
  type: 'http-signed-data-gateway';
  readonly config: HttpApiCallConfig;
  readonly aggregatedApiCall: HttpSignedDataAggregatedApiCall;
}

export type ApiCallPayload = RegularApiCallPayload | HttpApiCallPayload | HttpSignedApiCallPayload;

// ===========================================
// Workers
// ===========================================
export interface WorkerOptions {
  readonly cloudProvider: LocalOrCloudProvider;
  readonly deploymentId: string;
}

export interface InitializeProviderPayload {
  readonly functionName: 'initializeProvider';
  readonly state: ProviderState<EVMProviderState>;
  readonly logOptions: LogOptions;
}

export interface ProcessTransactionsPayload {
  readonly functionName: 'processTransactions';
  readonly state: ProviderState<EVMProviderSponsorState>;
  readonly logOptions: LogOptions;
}

export interface CallApiPayload {
  readonly functionName: 'callApi';
  readonly aggregatedApiCall: RegularAggregatedApiCall;
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
  readonly minConfirmations: number;
  readonly transactionHash: string;
  readonly logIndex: number;
  readonly chainId: string;
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
