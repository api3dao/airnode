import { Method, OIS, Operation, OracleEndpoint, SecurityScheme } from '@airnode/node/src/core/config/types';

export interface Options {
  ois: OIS;
  endpointName: string;
  parameters: { [key: string]: string };
  securitySchemes?: SecurityScheme[];
}

export interface State extends Options {
  operation: Operation;
  endpoint: OracleEndpoint;
}

export interface Parameters {
  [key: string]: string;
}

export interface RequestParameters {
  paths: { [key: string]: string };
  query: { [key: string]: string };
  cookies: { [key: string]: string };
  headers: { [key: string]: string };
}

export interface BasicAuth {
  password: string;
  username: string;
}

export interface Request {
  baseUrl: string;
  path: string;
  method: Method;
  headers: { [key: string]: string };
  params: { [key: string]: string };
  data: { [key: string]: string };
  auth?: BasicAuth;
}
