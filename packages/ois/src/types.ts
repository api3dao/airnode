// ===========================================
// General
// ===========================================
export const Method =  {
  get: 'get',
  post: 'post',
} as const;

export const ParameterTarget =  {
  path: 'path',
  query: 'query',
  header: 'header',
  cookie: 'cookie',
} as const;

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
}

export interface Path {
  [key: string]: Operation;
}

export const SecuritySchemeName = {
  bearer: 'bearer',
  basic: 'basic',
} as const;

export const SecuritySchemeType = {
  apiKey: 'apiKey',
  http: 'http',
  // oauth2: 'oauth2' ,
  // openIdConnect: 'openIdConnect' ,
} as const;

export const SecuritySchemeTarget = {
  query: 'query',
  header: 'header',
  cookie: 'cookie',
} as const;

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
  security: SecurityRequirement;
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

export interface ReservedParameter {
  default?: string;
  fixed?: string;
  name: string;
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

// ===========================================
// Security
// ===========================================
export interface SecurityScheme {
  securitySchemeName: string;
  value: string;
}

export interface ApiCredentials {
  [key: string]: SecurityScheme[];
}

export interface SecuritySpecification {
  id: string;
  apiCredentials: ApiCredentials;
  masterKeyMnemonic: string;
}
