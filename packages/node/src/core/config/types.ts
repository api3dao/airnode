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

export interface SecurityRequirement {
  [key: string]: string[];
}

export interface Operation {
  parameters: OperationParameter[];
  security?: SecurityRequirement[];
  servers?: Server[];
}

export interface Path {
  [key: string]: Operation;
}

export type SecuritySchemeType = 'apiKey' | 'http'; // | 'oauth2' | 'openIdConnect';
export type SecuritySchemeTarget = 'query' | 'header' | 'cookie';

export interface ApiSecurityScheme {
  in: SecuritySchemeTarget;
  name: string;
  scheme?: string;
  type: SecuritySchemeType;
}

export interface ApiComponents {
  securitySchemes: {
    [key: string]: ApiSecurityScheme;
  };
}

export interface ApiSpecification {
  id: string;
  components: ApiComponents;
  paths: { [key: string]: Path };
  security?: SecurityRequirement[];
  servers?: Server[];
}

// ===========================================
// Oracle Specification
// ===========================================
export interface OracleOperation {
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

export interface ReservedParameter {
  default?: string;
  fixed?: string;
  name: string;
}

export interface OracleSpecification {
  description?: string;
  externalDocs?: string;
  fixedOperationParameters: FixedParameter[];
  id: string;
  name: string;
  operation: OracleOperation;
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
  oracleSpecifications: OracleSpecification[];
}

// ===========================================
// Triggers
// ===========================================
export interface RequestTrigger {
  endpointId: string;
  endpointName: string;
  oisTitle: string;
}

export interface AggregatorTrigger {
  address: string;
  endpointName: string;
  oisTitle: string;
}

export interface Triggers {
  aggregator: AggregatorTrigger[];
  flux: AggregatorTrigger[];
  requests: RequestTrigger[];
}

// ===========================================
// Config
// ===========================================
export interface NodeSettings {
  nodeKey: string;
  platformKey: string;
  platformUrl: string;
  providerId: string;
  providerUrls: string[];
}

export interface Config {
  id: string;
  ois: OIS[];
  nodeSettings: NodeSettings;
  triggers: Triggers;
}

// ===========================================
// Security
// ===========================================
export interface SecurityScheme {
  in: SecuritySchemeTarget;
  name: string;
  securitySchemeName: string;
  type: SecuritySchemeType;
  value: string;
}

export interface SecuritySpecification {
  [apiTitle: string]: SecurityScheme[];
}
