import forEach from 'lodash/forEach';
import intersection from 'lodash/intersection';
import trimEnd from 'lodash/trimEnd';
import trimStart from 'lodash/trimStart';
import find from 'lodash/find';
import { z } from 'zod';
import { SchemaType, ValidatorRefinement } from '../types';

function removeBraces(value: string) {
  return trimEnd(trimStart(value, '{'), '}');
}

export const paremeterTargetSchema = z.union([
  z.literal('path'),
  z.literal('query'),
  z.literal('header'),
  z.literal('cookie'),
  z.literal('processing'),
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
  value: z.string(),
});

export const methodSchema = z.union([z.literal('get'), z.literal('post')]);

export const endpointOperationSchema = z.object({
  method: methodSchema,
  path: z.string(),
});

export const endpointParameterSchema = z.object({
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
  default: z.string().optional(),
  fixed: z.string().optional(),
});

export const serverSchema = z.object({
  url: z.string().url(),
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

export const apiSecuritySchemeScheme = z.discriminatedUnion('type', [
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

export const httpStatusCodes = z.union([z.literal('get'), z.literal('post')]);

export const pathSchema = z.record(httpStatusCodes, operationSchema);

const ensurePathParametersExist: ValidatorRefinement<SchemaType<typeof pathsSchema>> = (paths, ctx) => {
  forEach(paths, (pathData, rawPath) => {
    forEach(pathData, (paramData, httpMethod) => {
      const parameters = paramData!.parameters;
      // Match on anything in the path that is braces
      // i.e. The path /users/{id}/{action} will match ['{id}', '{action}']
      const regex = /\{([^}]+)\}/g;
      const matches = rawPath.match(regex)?.map(removeBraces) ?? [];

      // Check that all path parameters are defined
      matches.forEach((match) => {
        const parameter = parameters.find((p) => p.in === 'path' && p.name === match);
        if (!parameter) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Path parameter "${match}" is not found in "parameters"`,
            path: [rawPath, httpMethod, 'parameters'],
          });
        }
      }, rawPath);

      // Check that all parameters are used
      parameters.forEach((p, index) => {
        if (p.in === 'path' && !matches.includes(p.name)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Parameter "${p.name}" is not found in the URL path`,
            path: [rawPath, httpMethod, 'parameters', index],
          });
        }
      });
    });
  });
};

export const pathsSchema = z.record(pathSchema).superRefine(ensurePathParametersExist);

export const apiSpecificationSchema = z
  .object({
    components: apiComponentsSchema,
    paths: pathsSchema,
    servers: z.array(serverSchema),
    security: z.record(z.tuple([])),
  })
  .superRefine((apiSpecifications, ctx) => {
    Object.keys(apiSpecifications.security).forEach((enabledSecuritySchemeName, index) => {
      // Verify that ois.apiSpecifications.security.<securitySchemeName> is
      // referencing a valid ois.apiSpecifications.components.<securitySchemeName> object
      const enabledSecurityScheme = apiSpecifications.components.securitySchemes[enabledSecuritySchemeName];
      if (!enabledSecurityScheme) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Security scheme "${enabledSecuritySchemeName}" is not defined in "components.securitySchemes"`,
          path: ['security', index],
        });
      }
    });
  });

export const processingSpecificationSchema = z.object({
  environment: z.union([z.literal('Node 14'), z.literal('Node 14 async')]),
  value: z.string(),
  timeoutMs: z.number(),
});

export const endpointSchema = z.object({
  description: z.string().optional(),
  externalDocs: z.string().optional(),
  fixedOperationParameters: z.array(fixedParameterSchema),
  name: z.string(),
  operation: endpointOperationSchema,
  parameters: z.array(endpointParameterSchema),
  preProcessingSpecifications: z.array(processingSpecificationSchema).optional(),
  postProcessingSpecifications: z.array(processingSpecificationSchema).optional(),
  reservedParameters: z.array(reservedParameterSchema),
  summary: z.string().optional(),
});

const ensureSingleParameterUsagePerEndpoint: ValidatorRefinement<SchemaType<typeof baseOisSchema>> = (ois, ctx) => {
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

const ensureEndpointAndApiSpecificationParamsMatch: ValidatorRefinement<SchemaType<typeof baseOisSchema>> = (
  ois,
  ctx
) => {
  const { apiSpecifications, endpoints } = ois;

  // Ensure every "apiSpecification.paths" parameter is defined in "endpoints"
  forEach(apiSpecifications.paths, (pathData, rawPath) => {
    forEach(pathData, (paramData, httpMethod) => {
      const endpoint = endpoints.find(({ operation }) => operation.method === httpMethod && operation.path === rawPath);
      if (!endpoint) return; // Missing endpoint for apiSpecification should only be a warning

      const parameters = paramData!.parameters;
      parameters.forEach((apiParam) => {
        const endpointParam = endpoint.parameters.find(
          ({ operationParameter }) => operationParameter.in === apiParam.in && operationParameter.name === apiParam.name
        );
        if (!endpointParam) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `The "${apiParam.name}" in "${apiParam.in}" not found in "fixedOperationParameters" nor "parameters"`,
            path: ['ois', 'endpoints', endpoints.indexOf(endpoint)],
          });
        }
      });
    });
  });

  // Ensure every "endpoint" parameter references parameter from "apiSpecification.paths"
  endpoints.forEach((endpoint, endpointIndex) => {
    const { operation, parameters, fixedOperationParameters } = endpoint;

    const apiSpec = find(apiSpecifications.paths, (pathData, path) => {
      if (operation.path !== path) return false;

      return !!find(pathData, (_, httpMethod) => operation.method === httpMethod);
    });
    if (!apiSpec) {
      return ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `No matching API specification found in "apiSpecifications" section`,
        path: ['ois', 'endpoints', endpointIndex],
      });
    }

    // Ensure every "parameter" exist in "apiSpecification"
    parameters.forEach((endpointParam, endpointParamIndex) => {
      const { operationParameter } = endpointParam;
      const apiParam = apiSpec[operation.method]!.parameters.find(
        (p) => p.in === operationParameter.in && p.name === operationParameter.name
      );

      if (!apiParam) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `No matching API specification parameter found in "apiSpecifications" section`,
          path: ['ois', 'endpoints', endpointIndex, 'parameters', endpointParamIndex],
        });
      }
    });

    // Ensure every "fixedOperationParameters" exist in "apiSpecification"
    fixedOperationParameters.forEach((endpointParam, endpointParamIndex) => {
      const { operationParameter } = endpointParam;
      const apiParam = apiSpec[operation.method]!.parameters.find(
        (p) => p.in === operationParameter.in && p.name === operationParameter.name
      );

      if (!apiParam) {
        if (!apiParam) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `No matching API specification parameter found in "apiSpecifications" section`,
            path: ['ois', 'endpoints', endpointIndex, 'parameters', endpointParamIndex],
          });
        }
      }
    });
  });
};

export const baseOisSchema = z.object({
  oisFormat: z.string(),
  title: z.string(),
  version: z.string(),
  apiSpecifications: apiSpecificationSchema,
  endpoints: z.array(endpointSchema),
});

export const oisSchema = baseOisSchema
  .superRefine(ensureSingleParameterUsagePerEndpoint)
  .superRefine(ensureEndpointAndApiSpecificationParamsMatch);
