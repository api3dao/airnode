import { RESERVED_PARAMETERS } from './constants';

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

export interface RelaySponsorAddressSecurityScheme extends ConfigurableSecurityScheme {
  type: 'relaySponsorAddress';
}

export interface RelaySponsorWalletAddressSecurityScheme extends ConfigurableSecurityScheme {
  type: 'relaySponsorWalletAddress';
}

export type ApiSecurityScheme =
  | ApiKeySecurityScheme
  | HttpSecurityScheme
  | RelayChainIdSecurityScheme
  | RelayChainTypeSecurityScheme
  | RelayRequesterAddressSecurityScheme
  | RelaySponsorAddressSecurityScheme
  | RelaySponsorWalletAddressSecurityScheme;

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

export type ReservedParameterName = typeof RESERVED_PARAMETERS[number];

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
// OIS
// ===========================================
export interface OIS {
  oisFormat: string;
  title: string;
  version: string;
  apiSpecifications: ApiSpecification;
  endpoints: Endpoint[];
}
