// ===========================================
// API Specification
// ===========================================
export interface ApiInfo {
  title: string;
}

export interface Server {
  url: string;
}

export type Method = 'get' | 'post';
export type ParameterTarget = 'query' | 'path' | 'header' | 'cookie';

export interface OperationParameter {
  in: ParameterTarget;
  name: string;
}

export interface Security {
  [key: string]: string[];
}

export interface Operation {
  parameters: OperationParameter[];
  security?: Security[];
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
  components: ApiComponents;
  info: ApiInfo;
  paths: { [key: string]: Path };
  security?: Security[];
  servers?: Server[];
}

// ===========================================
// Oracle Specification
// ===========================================
export type OracleTriggerType = 'fluxFeed' | 'request';

export interface OracleTrigger {
  type: OracleTriggerType;
  value: string;
}

export interface OracleOperation {
  method: Method;
  path: string;
}

export interface ParameterValue {
  in: ParameterTarget;
  name: string;
  value?: string;
}

export interface EndpointParameter {
  default?: string;
  fixed?: string;
  name: string;
  operationParamer?: ParameterValue;
}

export interface OracleSpecification {
  fixedOperationParameters: ParameterValue[];
  operation: OracleOperation;
  parameters: EndpointParameter[];
  trigger: OracleTrigger;
}

export interface Specification {
  ois: string;
  apiSpecifications: ApiSpecification;
  oracleSpecifications: OracleSpecification[];
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
