// ===========================================
// API Specification
// ===========================================
export interface ApiInfo {
  description?: string;
  externalUrl?: string;
  logoUrl?: string;
  name?: string;
  title: string;
}

export interface Server {
  url: string;
}

export type PathMethod = 'get' | 'post';
export type ParameterTarget = 'query' | 'path' | 'header' | 'cookie';

export interface PathParameter {
  in: ParameterTarget;
  name: string;
}

export interface Path {
  [key: string]: {
    parameters: PathParameter[];
  };
}

export type SecuritySchemeType = 'apiKey' | 'http'; // | 'oauth2' | 'openIdConnect';
export type SecuritySchemeTarget = 'query' | 'header' | 'cookie';

export interface ApiSecurityScheme {
  in: SecuritySchemeTarget;
  name: string;
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
  servers: Server[];
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
  method: PathMethod;
  path: string;
}

export interface ParameterValue {
  in: ParameterTarget;
  name: string;
  value?: string;
}

export interface OracleParameter {
  default?: string;
  fixed?: string;
  name: string;
  operationParamer?: ParameterValue;
}

export interface OracleSpecification {
  fixedOperationParameters: ParameterValue[];
  operation: OracleOperation;
  parameters: OracleParameter[];
  trigger: OracleTrigger;
}

export interface Specification {
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

