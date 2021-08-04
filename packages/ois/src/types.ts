/* eslint-disable functional/prefer-readonly-type */

// ===========================================
// General
// ===========================================
export type Method = 'get' | 'post';
export type ParameterTarget = 'path' | 'query' | 'header' | 'cookie';

export interface OperationParameter {
  in: ParameterTarget;
  name: string;
}

// ===========================================
// API Specification
// ===========================================
export interface Server {
  url: string;
}

export interface Operation {
  parameters: OperationParameter[];
}

export interface Path {
  [key: string]: Operation;
}

export type SecuritySchemeName = 'bearer' | 'basic';
export type SecuritySchemeType = 'apiKey' | 'http'; // | 'oauth2' | 'openIdConnect';
export type SecuritySchemeTarget = 'query' | 'header' | 'cookie';

export interface ApiSecurityScheme {
  in?: SecuritySchemeTarget;
  name?: string;
  scheme?: SecuritySchemeName;
  type: SecuritySchemeType;
}

export interface ApiComponents {
  securitySchemes: {
    [key: string]: ApiSecurityScheme;
  };
}

export interface ApiSpecification {
  components: ApiComponents;
  paths: { [key: string]: Path };
  servers: Server[];
}

// ===========================================
// Endpoint Specification
// ===========================================
export interface EndpointOperation {
  method: Method;
  path: string;
}

export interface EndpointParameter {
  default?: string;
  description?: string;
  example?: string;
  name: string;
  operationParameter: OperationParameter;
  required?: boolean;
}

export interface FixedParameter {
  operationParameter: OperationParameter;
  value: string;
}

export enum ReservedParameterName {
  Path = '_path',
  Times = '_times',
  Type = '_type',
  RelayMetadata = '_relay_metadata',
}

export interface ReservedParameter {
  default?: string;
  fixed?: string;
  name: ReservedParameterName;
}

export interface Endpoint {
  description?: string;
  externalDocs?: string;
  fixedOperationParameters: FixedParameter[];
  name: string;
  operation: EndpointOperation;
  parameters: EndpointParameter[];
  reservedParameters: ReservedParameter[];
  summary?: string;
}

// ===========================================
// Security
// ===========================================
export interface ApiCredentials {
  securityScheme: string;
  value: string;
}

// ===========================================
// OIS
// ===========================================
export interface OIS {
  oisFormat: string;
  title: string;
  version: string;
  apiSpecifications: ApiSpecification;
  endpoints: Endpoint[];
  credentials: ApiCredentials;
}
