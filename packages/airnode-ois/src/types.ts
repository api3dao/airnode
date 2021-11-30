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

export interface HttpSecurityScheme {
  scheme: 'bearer' | 'basic';
  type: 'http';
}

export type SecuritySchemeTarget = 'query' | 'header' | 'cookie';
export interface ConfigurableSecurityScheme {
  in: SecuritySchemeTarget;
  name: string;
}

export interface ApiKeySecurityScheme extends ConfigurableSecurityScheme {
  type: 'apiKey';
}

export interface RelayChainIdSecurityScheme extends ConfigurableSecurityScheme {
  type: 'relayChainId';
}

export interface RelayChainTypeSecurityScheme extends ConfigurableSecurityScheme {
  type: 'relayChainType';
}

export interface RelayRequesterAddressSecurityScheme extends ConfigurableSecurityScheme {
  type: 'relayRequesterAddress';
}

export type ApiSecurityScheme =
  | ApiKeySecurityScheme
  | HttpSecurityScheme
  | RelayChainIdSecurityScheme
  | RelayChainTypeSecurityScheme
  | RelayRequesterAddressSecurityScheme;

// OAS supports also "oauth2" and "openIdConnect", but we don't
export type SecuritySchemeType = ApiSecurityScheme['type'];

export interface ApiComponents {
  securitySchemes: {
    [key: string]: ApiSecurityScheme;
  };
}

export interface ApiSpecification {
  components: ApiComponents;
  paths: { [key: string]: Path };
  servers: Server[];
  security: { [key: string]: [] };
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
  testable?: boolean;
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
}
