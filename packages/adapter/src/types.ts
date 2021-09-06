/* eslint-disable functional/prefer-readonly-type */

import { Endpoint, Method, OIS, Operation } from '@api3/ois';
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

export type ValueType = string | BigNumber | boolean;

export type ResponseType = 'uint256' | 'int256' | 'bool' | 'bytes32';

export interface ReservedParameters {
  readonly _path?: string;
  readonly _times?: string | BigNumber;
  readonly _type: ResponseType;
  readonly _relay_metadata?: string;
}

export interface RelayMetadataV1 {
  readonly _airnode_airnode_id: string;
  readonly _airnode_client_address: string;
  readonly _airnode_designated_wallet: string;
  readonly _airnode_endpoint_id: string;
  readonly _airnode_requester_index: string;
  readonly _airnode_request_id: string;
  readonly _airnode_chain_id: string;
  readonly _airnode_chain_type: string;
  readonly _airnode_airnode_rrp: string;
}
