export declare type Method = 'get' | 'post';
export declare type ParameterTarget = 'path' | 'query' | 'header' | 'cookie';
export interface OperationParameter {
    in: ParameterTarget;
    name: string;
}
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
export declare type SecuritySchemeName = 'bearer' | 'basic';
export declare type SecuritySchemeType = 'apiKey' | 'http';
export declare type SecuritySchemeTarget = 'query' | 'header' | 'cookie';
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
    paths: {
        [key: string]: Path;
    };
    security: SecurityRequirement;
    servers: Server[];
}
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
export interface OIS {
    oisFormat: string;
    title: string;
    version: string;
    apiSpecifications: ApiSpecification;
    endpoints: Endpoint[];
}
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
    masterKeyMnemonics?: string;
}
