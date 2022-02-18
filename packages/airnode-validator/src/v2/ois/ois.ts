import { z } from 'zod';
import intersection from 'lodash/intersection';
import { SchemaType, ValidatorRefinement } from '../types';
import { zodDiscriminatedUnion } from '../zod-discriminated-union';

export const paremeterTargetSchema = z.union([
  z.literal('path'),
  z.literal('query'),
  z.literal('header'),
  z.literal('cookie'),
]);
export type ParameterTarget = SchemaType<typeof paremeterTargetSchema>;

const nonReservedParameterNameSchema = z.string().refine(
  (val) => reservedParameterNameSchema.safeParse(val).success === false,
  (val) => ({ message: `"${val}" cannot be used because it is a name of a reserved parameter` })
);
export const operationParameterSchema = z.object({
  in: paremeterTargetSchema,
  name: nonReservedParameterNameSchema,
});
export type OperationParameter = SchemaType<typeof operationParameterSchema>;

export const fixedParameterSchema = z.object({
  operationParameter: operationParameterSchema,
  value: z.unknown(),
});
export type FixedParameter = SchemaType<typeof fixedParameterSchema>;

export const methodSchema = z.union([z.literal('get'), z.literal('post')]);
export type Method = SchemaType<typeof methodSchema>;

export const endpointOperationSchema = z.object({
  method: methodSchema,
  // TODO: Validate URL path
  path: z.string(),
});
export type EndpointOperation = SchemaType<typeof endpointOperationSchema>;

export const endpointParameterSchema = z.object({
  // TODO: Endpoint name validation
  name: z.string(),
  operationParameter: operationParameterSchema,
  default: z.string().optional(),
  description: z.string().optional(),
  example: z.string().optional(),
  required: z.boolean().optional(),
});
export type EndpointParameter = SchemaType<typeof endpointParameterSchema>;

export const reservedParameterNameSchema = z.union([z.literal('_type'), z.literal('_path'), z.literal('_times')]);
export type ReservedParameterName = SchemaType<typeof reservedParameterNameSchema>;

export const reservedParameterSchema = z.object({
  name: reservedParameterNameSchema,
  // TODO: Is this correct? Shouldn't one of them always exist?
  default: z.string().optional(),
  fixed: z.string().optional(),
});
export type ReservedParameter = SchemaType<typeof reservedParameterSchema>;

export const serverSchema = z.object({
  // TODO: Validate URL
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

const ensureSingleParameterUsagePerEndpoint: ValidatorRefinement<OIS> = (ois, ctx) => {
  ois.endpoints.forEach((endpoint, index) => {
    const params = endpoint.parameters.map((p) => p.operationParameter.name);
    const fixedParams = endpoint.fixedOperationParameters.map((p) => p.operationParameter.name);

    const both = intersection(params, fixedParams);
    if (both.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Parameters "${both.join(',')}" are used in both "parameters" and "fixedOperationOperations"`,
        path: ['ois', 'endpoints', index],
      });
    }
  });
};

export const baseOisSchema = z.object({
  oisFormat: z.literal('1.0.0'),
  // TODO: Validate title
  title: z.string(),
  version: z.string(),
  apiSpecifications: apiSpecificationSchema,
  endpoints: z.array(endpointSchema),
});
export type OIS = SchemaType<typeof baseOisSchema>;
export const oisSchema = baseOisSchema.superRefine(ensureSingleParameterUsagePerEndpoint);
