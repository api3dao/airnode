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

const nonReservedParameterNameSchema = z.string().refine(
  (val) => reservedParameterNameSchema.safeParse(val).success === false,
  (val) => ({ message: `"${val}" cannot be used because it is a name of a reserved parameter` })
);
export const operationParameterSchema = z.object({
  in: paremeterTargetSchema,
  name: nonReservedParameterNameSchema,
});

export const fixedParameterSchema = z.object({
  operationParameter: operationParameterSchema,
  // TODO: This could be any JSON value
  value: z.string(),
});

export const methodSchema = z.union([z.literal('get'), z.literal('post')]);

export const endpointOperationSchema = z.object({
  method: methodSchema,
  // TODO: Validate URL path
  path: z.string(),
});

export const endpointParameterSchema = z.object({
  // TODO: Endpoint name validation
  name: z.string(),
  operationParameter: operationParameterSchema,
  default: z.string().optional(),
  description: z.string().optional(),
  example: z.string().optional(),
  required: z.boolean().optional(),
});

export const reservedParameterNameSchema = z.union([z.literal('_type'), z.literal('_path'), z.literal('_times')]);

export const reservedParameterSchema = z.object({
  name: reservedParameterNameSchema,
  // TODO: Is this correct? Shouldn't one of them always exist?
  default: z.string().optional(),
  fixed: z.string().optional(),
});

export const serverSchema = z.object({
  // TODO: Validate URL
  url: z.string(),
});

export const httpSecuritySchemeScheme = z.object({
  scheme: z.union([z.literal('bearer'), z.literal('basic')]),
  type: z.literal('http'),
});

export const securitySchemeTargetSchema = z.union([z.literal('query'), z.literal('header'), z.literal('cookie')]);

export const configurableSecuritySchemeScheme = z.object({
  in: securitySchemeTargetSchema,
  name: z.string(),
});

export const apiKeySecuritySchemeScheme = configurableSecuritySchemeScheme.extend({ type: z.literal('apiKey') });

export const relayChainIdSecuritySchemeScheme = configurableSecuritySchemeScheme.extend({
  type: z.literal('relayChainId'),
});

export const relayChainTypeSecuritySchemeScheme = configurableSecuritySchemeScheme.extend({
  type: z.literal('relayChainType'),
});

export const relayRequesterAddressSecuritySchemeScheme = configurableSecuritySchemeScheme.extend({
  type: z.literal('relayRequesterAddress'),
});

export const relaySponsorAddressSecuritySchemeScheme = configurableSecuritySchemeScheme.extend({
  type: z.literal('relaySponsorAddress'),
});

export const relaySponsorWalletAddressSecuritySchemeScheme = configurableSecuritySchemeScheme.extend({
  type: z.literal('relaySponsorWalletAddress'),
});

export const apiSecuritySchemeScheme = zodDiscriminatedUnion('type', [
  apiKeySecuritySchemeScheme,
  httpSecuritySchemeScheme,
  relayChainIdSecuritySchemeScheme,
  relayChainTypeSecuritySchemeScheme,
  relayRequesterAddressSecuritySchemeScheme,
  relaySponsorAddressSecuritySchemeScheme,
  relaySponsorWalletAddressSecuritySchemeScheme,
]);

// OAS supports also "oauth2" and "openIdConnect", but we don't

export const apiComponentsSchema = z.object({
  securitySchemes: z.record(apiSecuritySchemeScheme),
});

export const operationSchema = z.object({
  parameters: z.array(operationParameterSchema),
});

export const pathSchema = z.record(operationSchema);

export const apiSpecificationSchema = z.object({
  components: apiComponentsSchema,
  paths: z.record(pathSchema),
  servers: z.array(serverSchema),
  security: z.record(z.tuple([])),
});

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
  // TODO: Expect semver (and for now only possible value os 1.0.0)
  oisFormat: z.string(),
  // TODO: Validate title
  title: z.string(),
  version: z.string(),
  apiSpecifications: apiSpecificationSchema,
  endpoints: z.array(endpointSchema),
});
type OIS = SchemaType<typeof baseOisSchema>;
export const oisSchema = baseOisSchema.superRefine(ensureSingleParameterUsagePerEndpoint);
