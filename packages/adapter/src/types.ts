/* eslint-disable functional/prefer-readonly-type */

import { Endpoint, Method, OIS, Operation, ApiCredentials } from '@api3/ois';
import { BigNumber } from 'bignumber.js';

export interface BuildRequestOptions {
  readonly ois: OIS;
  readonly endpointName: string;
  readonly parameters: { readonly [key: string]: string };
  readonly credentials?: ApiCredentials;
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

export type ValueType = string | BigNumber | boolean;

export type ResponseType = 'uint256' | 'int256' | 'bool' | 'bytes32';

export interface ReservedParameters {
  readonly _path?: string;
  readonly _times?: string | BigNumber;
  readonly _type: ResponseType;
  readonly _relay_metadata?: string;
}
