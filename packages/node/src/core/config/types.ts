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

export interface SecurityScheme {
  in: SecuritySchemeTarget;
  name: string;
  type: SecuritySchemeType;
}

export interface ApiComponents {
  securitySchemes: {
    [key: string]: SecurityScheme;
  };
}

export interface ApiSpecification {
  components: ApiComponents;
  info: ApiInfo;
  paths: { [key: string]: Path };
  servers: Server[];
}

export type OracleTriggerType = 'fluxFeed' | 'request';

export interface OracleTrigger {
  type: OracleTriggerType;
  value?: string;
}

export interface EndpointOperation {
  method: PathMethod;
  path: string;
}

export interface EndpointParameterValue {
  in: ParameterTarget;
  name: string;
  value: string;
}

export interface OracleSpecification {
  apiOperation: EndpointOperation;
  defaultOperationParameterValues: EndpointParameterValue[];
  path: string;
  times?: string;
  trigger: OracleTrigger;
}
