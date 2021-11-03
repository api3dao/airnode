/* eslint-disable functional/prefer-readonly-type */

import { Endpoint, Method, OIS, Operation } from '@api3/airnode-ois';
import { BigNumber } from 'bignumber.js';

export interface ApiCredentials {
  readonly securitySchemeName: string;
  readonly securitySchemeValue: string;
}

export interface BuildRequestOptions {
  readonly ois: OIS;
  readonly endpointName: string;
  readonly parameters: Parameters;
  readonly metadataParameters: Parameters;
  readonly apiCredentials: ApiCredentials[];
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

export const baseResponseTypes = ['uint256', 'int256', 'bool', 'bytes32', 'address', 'bytes', 'string'] as const;
export type BaseResponseType = typeof baseResponseTypes[number];
// Use might pass a complex type (e.g. int256[3][]) which we cannot type
export type ResponseType = string;

export interface ReservedParameters {
  readonly _path?: string;
  readonly _times?: string | BigNumber;
  readonly _type: ResponseType;
  readonly _relay_metadata?: string;
}

export type MetadataParameterKeysV1 =
  | '_airnode_airnode_address'
  | '_airnode_requester_address'
  | '_airnode_sponsor_wallet_address'
  | '_airnode_endpoint_id'
  | '_airnode_sponsor_address'
  | '_airnode_request_id'
  | '_airnode_chain_id'
  | '_airnode_chain_type'
  | '_airnode_airnode_rrp';

export type MetadataParametersV1 = {
  readonly [key in MetadataParameterKeysV1]: string;
};
