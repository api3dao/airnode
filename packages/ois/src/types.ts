// ===========================================
// General
// ===========================================
export type Method = 'get' | 'post';
export type ParameterTarget = 'path' | 'query' | 'header' | 'cookie';

export type OperationParameter = {
  readonly in: ParameterTarget;
  readonly name: string;
};

// ===========================================
// API Specification
// ===========================================
export type Server = {
  readonly url: string;
};

export type SecurityRequirement = {
  readonly [key: string]: readonly string[];
};

export type Operation = {
  readonly parameters: readonly OperationParameter[];
};

export type Path = {
  readonly [key: string]: Operation;
};

export type SecuritySchemeName = 'bearer' | 'basic';
export type SecuritySchemeType = 'apiKey' | 'http'; // | 'oauth2' | 'openIdConnect';
export type SecuritySchemeTarget = 'query' | 'header' | 'cookie';

export type ApiSecurityScheme = {
  readonly in?: SecuritySchemeTarget;
  readonly name?: string;
  readonly scheme?: SecuritySchemeName;
  readonly type: SecuritySchemeType;
};

export type ApiComponents = {
  readonly securitySchemes: {
    readonly [key: string]: ApiSecurityScheme;
  };
};

export type ApiSpecification = {
  readonly components: ApiComponents;
  readonly paths: { readonly [key: string]: Path };
  readonly security: SecurityRequirement;
  readonly servers: readonly Server[];
};

// ===========================================
// Endpoint Specification
// ===========================================
export type EndpointOperation = {
  readonly method: Method;
  readonly path: string;
};

export type EndpointParameter = {
  readonly default?: string;
  readonly description?: string;
  readonly example?: string;
  readonly name: string;
  readonly operationParameter: OperationParameter;
  readonly required?: boolean;
};

export type FixedParameter = {
  readonly operationParameter: OperationParameter;
  readonly value: string;
};

export enum ReservedParameterName {
  Path = '_path',
  Times = '_times',
  Type = '_type',
  RelayMetadata = '_relay_metadata',
}

export type ReservedParameter = {
  readonly default?: string;
  readonly fixed?: string;
  readonly name: ReservedParameterName;
};

export type Endpoint = {
  readonly description?: string;
  readonly externalDocs?: string;
  readonly fixedOperationParameters: readonly FixedParameter[];
  readonly name: string;
  readonly operation: EndpointOperation;
  readonly parameters: readonly EndpointParameter[];
  readonly reservedParameters: readonly ReservedParameter[];
  readonly summary?: string;
};

// ===========================================
// OIS
// ===========================================
export type OIS = {
  readonly oisFormat: string;
  readonly title: string;
  readonly version: string;
  readonly apiSpecifications: ApiSpecification;
  readonly endpoints: readonly Endpoint[];
};

// ===========================================
// Security
// ===========================================
export type SecuritySchemeSecret = {
  readonly securitySchemeName: string;
  readonly value: string;
};

export type ApiCredentials = {
  readonly [key: string]: readonly SecuritySchemeSecret[];
};

export type SecuritySpecification = {
  readonly id: string;
  readonly apiCredentials: ApiCredentials;
  readonly masterKeyMnemonic: string;
};
