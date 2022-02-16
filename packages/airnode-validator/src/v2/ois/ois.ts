import { z } from 'zod';
import { SchemaType } from '../types';
import { zodDiscriminatedUnion } from '../zod-discriminated-union';

export const paremeterTargetSchema = z.union([
  z.literal('path'),
  z.literal('query'),
  z.literal('header'),
  z.literal('cookie'),
]);
export type ParameterTarget = SchemaType<typeof paremeterTargetSchema>;

export const operationParameterSchema = z.object({
  in: paremeterTargetSchema,
  name: z.string(),
});
export type OperationParameter = SchemaType<typeof operationParameterSchema>;

export const fixedParameterSchema = z.object({
  operationParameter: operationParameterSchema,
  value: z.string(),
});
export type FixedParameter = SchemaType<typeof fixedParameterSchema>;

export const methodSchema = z.union([z.literal('get'), z.literal('post')]);
export type Method = SchemaType<typeof methodSchema>;

export const endpointOperationSchema = z.object({
  method: methodSchema,
  path: z.string(),
});
export type EndpointOperation = SchemaType<typeof endpointOperationSchema>;

export const endpointParameterSchema = z.object({
  default: z.string().optional(),
  description: z.string().optional(),
  example: z.string().optional(),
  name: z.string(),
  operationParameter: operationParameterSchema,
  required: z.boolean().optional(),
});
export type EndpointParameter = SchemaType<typeof endpointParameterSchema>;

export const reservedParameterNameSchema = z.union([z.literal('_type'), z.literal('_path'), z.literal('_times')]);
export type ReservedParameterName = SchemaType<typeof reservedParameterNameSchema>;

export const reservedParameterSchema = z.object({
  default: z.string().optional(),
  fixed: z.string().optional(),
  name: reservedParameterNameSchema,
});
export type ReservedParameter = SchemaType<typeof reservedParameterSchema>;

export const serverSchema = z.object({
  url: z.string(),
});
export type Server = SchemaType<typeof serverSchema>;

export const httpSecuritySchemeScheme = z.object({
  scheme: z.union([z.literal('bearer'), z.literal('basic')]),
  type: z.literal('http'),
});
export type HttpSecurityScheme = SchemaType<typeof httpSecuritySchemeScheme>;

export const securitySchemeTargetSchema = z.union([z.literal('query'), z.literal('header'), z.literal('cookie')]);
export type SecuritySchemeTarget = SchemaType<typeof securitySchemeTargetSchema>;

export const configurableSecuritySchemeScheme = z.object({
  in: securitySchemeTargetSchema,
  name: z.string(),
});
export type ConfigurableSecurityScheme = SchemaType<typeof configurableSecuritySchemeScheme>;

export const apiKeySecuritySchemeScheme = configurableSecuritySchemeScheme.extend({ type: z.literal('apiKey') });
export type ApiKeySecurityScheme = SchemaType<typeof apiKeySecuritySchemeScheme>;

export const relayChainIdSecuritySchemeScheme = configurableSecuritySchemeScheme.extend({
  type: z.literal('relayChainId'),
});
export type RelayChainIdSecurityScheme = SchemaType<typeof relayChainIdSecuritySchemeScheme>;

export const relayChainTypeSecuritySchemeScheme = configurableSecuritySchemeScheme.extend({
  type: z.literal('relayChainType'),
});
export type RelayChainTypeSecurityScheme = SchemaType<typeof relayChainTypeSecuritySchemeScheme>;

export const relayRequesterAddressSecuritySchemeScheme = configurableSecuritySchemeScheme.extend({
  type: z.literal('relayRequesterAddress'),
});
export type RelayRequesterAddressSecurityScheme = SchemaType<typeof relayRequesterAddressSecuritySchemeScheme>;

export const relaySponsorAddressSecuritySchemeScheme = configurableSecuritySchemeScheme.extend({
  type: z.literal('relaySponsorAddress'),
});
export type RelaySponsorAddressSecurityScheme = SchemaType<typeof relaySponsorAddressSecuritySchemeScheme>;

export const relaySponsorWalletAddressSecuritySchemeScheme = configurableSecuritySchemeScheme.extend({
  type: z.literal('relaySponsorWalletAddress'),
});
export type RelaySponsorWalletAddressSecurityScheme = SchemaType<typeof relaySponsorWalletAddressSecuritySchemeScheme>;

export const apiSecuritySchemeScheme = zodDiscriminatedUnion('type', [
  apiKeySecuritySchemeScheme,
  httpSecuritySchemeScheme,
  relayChainIdSecuritySchemeScheme,
  relayChainTypeSecuritySchemeScheme,
  relayRequesterAddressSecuritySchemeScheme,
  relaySponsorAddressSecuritySchemeScheme,
  relaySponsorWalletAddressSecuritySchemeScheme,
]);
export type ApiSecurityScheme = SchemaType<typeof apiSecuritySchemeScheme>;

// OAS supports also "oauth2" and "openIdConnect", but we don't
export type SecuritySchemeType = ApiSecurityScheme['type'];

export const apiComponentsSchema = z.object({
  securitySchemes: z.record(apiSecuritySchemeScheme),
});
export type ApiComponents = SchemaType<typeof apiComponentsSchema>;

export const operationSchema = z.object({
  parameters: z.array(operationParameterSchema),
});
export type Operation = SchemaType<typeof operationSchema>;

export const pathSchema = z.record(operationSchema);
export type Path = SchemaType<typeof pathSchema>;

export const apiSpecificationSchema = z.object({
  components: apiComponentsSchema,
  paths: z.record(pathSchema),
  servers: z.array(serverSchema),
  security: z.record(z.tuple([])),
});
export type ApiSpecification = SchemaType<typeof apiSpecificationSchema>;

export const endpointSchema = z.object({
  description: z.string().optional(),
  externalDocs: z.string().optional(),
  fixedOperationParameters: z.array(fixedParameterSchema),
  name: z.string(),
  operation: endpointOperationSchema,
  parameters: z.array(endpointParameterSchema),
  reservedParameters: z.array(reservedParameterSchema),
  summary: z.string().optional(),
});
export type Endpoint = SchemaType<typeof endpointSchema>;

export const oisSchema = z.object({
  oisFormat: z.string(),
  title: z.string(),
  version: z.string(),
  apiSpecifications: apiSpecificationSchema,
  endpoints: z.array(endpointSchema),
});
export type OIS = SchemaType<typeof oisSchema>;
