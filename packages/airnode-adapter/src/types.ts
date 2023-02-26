import { Endpoint, Method, OIS, Operation } from '@api3/ois';
import { BigNumber } from 'bignumber.js';
import { baseResponseTypes, MULTIPLE_PARAMETERS_DELIMETER, PATH_DELIMETER } from './constants';

export interface RequestMetadata {
  requesterAddress: string;
  sponsorWalletAddress: string;
  sponsorAddress: string;
  requestId: string;
  chainId: string;
  chainType: string;
}

export interface BaseApiCredentials {
  readonly securitySchemeName: string;
  readonly securitySchemeValue: string;
}

export interface BuildRequestOptions {
  readonly ois: OIS;
  readonly endpointName: string;
  readonly parameters: Parameters;
  readonly apiCredentials: BaseApiCredentials[];
  // NOTE: Metadata is "null" in case the request was triggered by testing gateway
  readonly metadata: RequestMetadata | null;
}

export interface CachedBuildRequestOptions extends BuildRequestOptions {
  readonly operation: Operation;
  readonly endpoint: Endpoint;
}

export interface Parameters {
  readonly [key: string]: string;
}

export interface RequestParameters {
  readonly paths: { [key: string]: string };
  readonly query: { [key: string]: string };
  readonly headers: { [key: string]: string };
}

export interface BuilderParameters extends RequestParameters {
  readonly cookies: { [key: string]: string };
}

export interface Request {
  readonly baseUrl: string;
  readonly path: string;
  readonly method: Method;
  readonly headers: { [key: string]: string };
  readonly data: { [key: string]: string };
}

export interface Config {
  readonly timeout?: number;
}

export type ValueType = string | BigNumber | boolean | Array<ValueType>;

export type BaseResponseType = (typeof baseResponseTypes)[number];
// Use might pass a complex type (e.g. int256[3][]) which we cannot type
export type ResponseType = string;

// Reserved parameters specific for response processing
// i.e. excludes _gasPrice and _minConfirmations
export interface ResponseReservedParameters {
  _path?: string;
  _times?: string;
  _type: ResponseType;
}

export interface ExtractedAndEncodedResponse {
  rawValue: unknown;
  values: ValueType[];
  encodedValue: string;
}

export type ReservedParametersDelimeter = typeof MULTIPLE_PARAMETERS_DELIMETER | typeof PATH_DELIMETER;
