import { Endpoint, Method, OIS, Operation, SecuritySchemeSecret } from '@airnode/ois';
import BigNumber from 'bignumber.js';

export interface BuildRequestOptions {
  ois: OIS;
  endpointName: string;
  parameters: Parameters;
  metadataParameters: Parameters;
  securitySchemeSecrets?: SecuritySchemeSecret[];
}

export interface CachedBuildRequestOptions extends BuildRequestOptions {
  operation: Operation;
  endpoint: Endpoint;
}

export interface Parameters {
  [key: string]: string;
}

export interface RequestParameters {
  paths: { [key: string]: string };
  query: { [key: string]: string };
  headers: { [key: string]: string };
}

export interface BuilderParameters extends RequestParameters {
  cookies: { [key: string]: string };
}

export interface Request {
  baseUrl: string;
  path: string;
  method: Method;
  headers: { [key: string]: string };
  data: { [key: string]: string };
}

export interface Config {
  timeout?: number;
}

export type ValueType = string | BigNumber | boolean;

export type ResponseType = 'int256' | 'bool' | 'bytes32';

export interface ReservedParameters {
  _path?: string;
  _times?: string | BigNumber;
  _type: ResponseType;
  _relay_metadata?: string;
}

export type MetadataParameterKeysV1 =
  | '_airnode_provider_id'
  | '_airnode_client_address'
  | '_airnode_designated_wallet'
  | '_airnode_endpoint_id'
  | '_airnode_requester_index'
  | '_airnode_request_id'
  | '_airnode_chain_id'
  | '_airnode_chain_type'
  | '_airnode_airnode';

export type MetadataParametersV1 = {
  [key in MetadataParameterKeysV1]: string;
};
