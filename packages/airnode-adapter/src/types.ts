import { Endpoint, Method, OIS, Operation } from '@api3/airnode-ois';
import { BigNumber } from 'bignumber.js';
import { baseResponseTypes, MULTIPLE_PARAMETERS_DELIMETER, PATH_DELIMETER } from './constants';

export interface ApiCredentials {
  readonly securitySchemeName: string;
  readonly securitySchemeValue: string;
}

export interface RequestMetadata {
  airnodeAddress: string;
  requesterAddress: string;
  sponsorWalletAddress: string;
  endpointId: string;
  sponsorAddress: string;
  requestId: string;
  chainId: string;
  chainType: string;
  airnodeRrpAddress: string;
}

export interface BuildRequestOptions {
  readonly ois: OIS;
  readonly endpointName: string;
  readonly parameters: Parameters;
  readonly apiCredentials: ApiCredentials[];
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

export type BaseResponseType = typeof baseResponseTypes[number];
// Use might pass a complex type (e.g. int256[3][]) which we cannot type
export type ResponseType = string;

export interface ReservedParameters {
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

export class SizeLimitError extends Error {
  constructor(message: string) {
    super(message);
    // Note: Setting prototype is needed in Typescript versions after 2.2 to check the error instance
    // https://github.com/Microsoft/TypeScript/issues/13965#issuecomment-278570200
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'SizeLimitError';
    this.message = message;
  }
}

export class MissingValueError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'MissingValueError';
    this.message = message;
  }
}

export class InvalidTypeError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'InvalidTypeError';
    this.message = message;
  }
}
export class ValueConversionError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'ValueConversionError';
    this.message = message;
  }
}
export class EncodingError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'EncodingError';
    this.message = message;
  }
}
