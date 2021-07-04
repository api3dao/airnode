/* eslint-disable functional/prefer-readonly-type */

// ===========================================
// General
// ===========================================
export type Method = 'get' | 'post';
export type ParameterTarget = 'path' | 'query' | 'header' | 'cookie';

export type OperationParameter = {
  in: ParameterTarget;
  name: string;
};

// ===========================================
// API Specification
// ===========================================
export type Server = {
  url: string;
};

export type SecurityRequirement = {
  [key: string]: string[];
};

export type Operation = {
  parameters: OperationParameter[];
};

export type Path = {
  [key: string]: Operation;
};

export type SecuritySchemeName = 'bearer' | 'basic';
export type SecuritySchemeType = 'apiKey' | 'http'; // | 'oauth2' | 'openIdConnect';
export type SecuritySchemeTarget = 'query' | 'header' | 'cookie';

export type ApiSecurityScheme = {
  in?: SecuritySchemeTarget;
  name?: string;
  scheme?: SecuritySchemeName;
  type: SecuritySchemeType;
};

export type ApiComponents = {
  securitySchemes: {
    [key: string]: ApiSecurityScheme;
  };
};

export type ApiSpecification = {
  components: ApiComponents;
  paths: { [key: string]: Path };
  security: SecurityRequirement;
  servers: Server[];
};

// ===========================================
// Endpoint Specification
// ===========================================
export type EndpointOperation = {
  method: Method;
  path: string;
};

export type EndpointParameter = {
  default?: string;
  description?: string;
  example?: string;
  name: string;
  operationParameter: OperationParameter;
  required?: boolean;
};

export type FixedParameter = {
  operationParameter: OperationParameter;
  value: string;
};

export enum ReservedParameterName {
  Path = '_path',
  Times = '_times',
  Type = '_type',
  RelayMetadata = '_relay_metadata',
}

export type ReservedParameter = {
  default?: string;
  fixed?: string;
  name: ReservedParameterName;
};

export type Endpoint = {
  description?: string;
  externalDocs?: string;
  fixedOperationParameters: FixedParameter[];
  name: string;
  operation: EndpointOperation;
  parameters: EndpointParameter[];
  reservedParameters: ReservedParameter[];
  summary?: string;
};

// ===========================================
// OIS
// ===========================================
export type OIS = {
  oisFormat: string;
  title: string;
  version: string;
  apiSpecifications: ApiSpecification;
  endpoints: Endpoint[];
};

// ===========================================
// Security
// ===========================================
export type SecuritySchemeSecret = {
  securitySchemeName: string;
  value: string;
};

export type ApiCredentials = {
  [key: string]: SecuritySchemeSecret[];
};

export type SecuritySpecification = {
  id: string;
  apiCredentials: ApiCredentials;
  masterKeyMnemonic: string;
};
