import { Method, OIS, Operation, Endpoint, SecurityScheme } from '@airnode/ois';

export interface Options {
  ois: OIS;
  endpointName: string;
  parameters: { [key: string]: string };
  securitySchemes?: SecurityScheme[];
}

export interface State extends Options {
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

export type ValueType = string | number | boolean;

export type ResponseType = 'int256' | 'bool' | 'bytes32';

export interface ResponseParameters {
  _path?: string;
  _times?: number;
  _type: ResponseType;
}
