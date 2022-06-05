import forEach from 'lodash/forEach';
import trimEnd from 'lodash/trimEnd';
import trimStart from 'lodash/trimStart';
import find from 'lodash/find';
import { SuperRefinement, z } from 'zod';
import { SchemaType } from '../types';

function removeBraces(value: string) {
  return trimEnd(trimStart(value, '{'), '}');
}

export const parameterTargetSchema = z.union([
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
export const operationParameterSchema = z
  .object({
    in: parameterTargetSchema,
    name: nonReservedParameterNameSchema,
  })
  .strict();

export const fixedParameterSchema = z
  .object({
    operationParameter: operationParameterSchema,
    value: z.string(),
  })
  .strict();

export const methodSchema = z.union([z.literal('get'), z.literal('post')]);

// Path name must start wih "/" and must not contain space character
export const pathNameSchema = z.string().regex(/^\/[^\s]*$/);

export const endpointOperationSchema = z
  .object({
    method: methodSchema,
    path: pathNameSchema,
  })
  .strict();

export const endpointParameterSchema = z
  .object({
    // Parameter name must not contain spaces
    name: z.string().regex(/^[^\s]+$/),
    operationParameter: operationParameterSchema,

    // The following optional fields are defined by OAS. They are intended to provide more
    // clarity about a parameter and are ignored by Airnode
    description: z.string().optional(),
    example: z.string().optional(),

    // Default value is used when the user (requester) does not provide a value for the parameter
    // TODO: Fix
    default: z.string().optional(),
    // This property is completely ignored by Airnode
    required: z.boolean().optional(),
  })
  .strict();

export const reservedParameterNameSchema = z.union([z.literal('_type'), z.literal('_path'), z.literal('_times')]);

export const reservedParameterSchema = z
  .object({
    name: reservedParameterNameSchema,
    // At most one of the following fields can be used. If none of them is used,
    // the user (requester) is expected to pass the value as parameter
    default: z.string().optional(),
    fixed: z.string().optional(),
  })
  .strict()
  .refine((value) => {
    const { fixed, default: defaultValue } = value;

    // Explicitly check for "undefined", since empty string is a valid reserved parameter value
    const isFixedValueDefined = fixed !== undefined;
    const isDefaultValueDefined = defaultValue !== undefined;

    return !isFixedValueDefined || !isDefaultValueDefined;
  }, 'Reserved parameter must use at most one of "default" and "fixed" properties');

export const serverSchema = z
  .object({
    url: z.string().url(),
  })
  .strict();

export const httpSecuritySchemeSchema = z
  .object({
    scheme: z.union([z.literal('bearer'), z.literal('basic')]),
    type: z.literal('http'),
  })
  .strict();

export const securitySchemeTargetSchema = z.union([z.literal('query'), z.literal('header'), z.literal('cookie')]);

export const configurableSecuritySchemeSchema = z
  .object({
    in: securitySchemeTargetSchema,
    name: z.string(),
  })
  .strict();

export const apiKeySecuritySchemeSchema = configurableSecuritySchemeSchema
  .extend({ type: z.literal('apiKey') })
  .strict();

export const relayChainIdSecuritySchemeSchema = configurableSecuritySchemeSchema
  .extend({
    type: z.literal('relayChainId'),
  })
  .strict();

export const relayChainTypeSecuritySchemeSchema = configurableSecuritySchemeSchema
  .extend({
    type: z.literal('relayChainType'),
  })
  .strict();

export const relayRequesterAddressSecuritySchemeSchema = configurableSecuritySchemeSchema
  .extend({
    type: z.literal('relayRequesterAddress'),
  })
  .strict();

export const relaySponsorAddressSecuritySchemeSchema = configurableSecuritySchemeSchema
  .extend({
    type: z.literal('relaySponsorAddress'),
  })
  .strict();

export const relaySponsorWalletAddressSecuritySchemeSchema = configurableSecuritySchemeSchema
  .extend({
    type: z.literal('relaySponsorWalletAddress'),
  })
  .strict();

export const apiSecuritySchemeSchema = z.discriminatedUnion('type', [
  apiKeySecuritySchemeSchema,
  httpSecuritySchemeSchema,
  relayChainIdSecuritySchemeSchema,
  relayChainTypeSecuritySchemeSchema,
  relayRequesterAddressSecuritySchemeSchema,
  relaySponsorAddressSecuritySchemeSchema,
  relaySponsorWalletAddressSecuritySchemeSchema,
]);

// OAS supports also "oauth2" and "openIdConnect", but we don't

export const apiComponentsSchema = z
  .object({
    securitySchemes: z.record(z.string(), apiSecuritySchemeSchema),
  })
  .strict();

export const operationSchema = z
  .object({
    parameters: z.array(operationParameterSchema),
  })
  .strict();

export const httpStatusCodes = z.union([z.literal('get'), z.literal('post')]);

export const pathSchema = z.record(httpStatusCodes, operationSchema);

const ensurePathParametersExist: SuperRefinement<Paths> = (paths, ctx) => {
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

export const pathsSchema = z.record(pathNameSchema, pathSchema).superRefine(ensurePathParametersExist);

export const apiSpecificationSchema = z
  .object({
    components: apiComponentsSchema,
    paths: pathsSchema,
    servers: z.array(serverSchema),
    security: z.record(z.string(), z.tuple([])),
  })
  .strict()
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

export const processingSpecificationSchema = z
  .object({
    environment: z.union([z.literal('Node 14'), z.literal('Node 14 async')]),
    value: z.string(),
    timeoutMs: z.number().int(),
  })
  .strict();

export const endpointSchema = z
  .object({
    fixedOperationParameters: z.array(fixedParameterSchema),
    name: z.string(),
    operation: endpointOperationSchema,
    parameters: z.array(endpointParameterSchema),
    // TODO: Make required
    preProcessingSpecifications: z.array(processingSpecificationSchema).optional(),
    postProcessingSpecifications: z.array(processingSpecificationSchema).optional(),
    reservedParameters: z.array(reservedParameterSchema),

    // The following fields are ignored by Airnode
    description: z.string().optional(),
    externalDocs: z.string().optional(),
    summary: z.string().optional(),
  })
  .strict();

const ensureSingleParameterUsagePerEndpoint: SuperRefinement<{
  endpoints: Endpoint[];
}> = (ois, ctx) => {
  ois.endpoints.forEach((endpoint, oisIndex) => {
    const params = endpoint.parameters.map((p) => p.operationParameter);
    const fixedParams = endpoint.fixedOperationParameters.map((p) => p.operationParameter);
    const checkUniqueness = (section: 'parameters' | 'fixedOperationParameters') => {
      const paramsToCheck = section === 'parameters' ? params : fixedParams;
      paramsToCheck.forEach((param, paramIndex) => {
        const count = paramsToCheck.filter((p) => p.in === param.in && p.name === param.name).length;
        if (count > 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Parameter "${param.name}" in "${param.in}" is used multiple times`,
            path: ['ois', 'endpoints', oisIndex, section, paramIndex],
          });
        }
      });
    };

    // Check uniqueness in the respective sections
    checkUniqueness('parameters');
    checkUniqueness('fixedOperationParameters');

    // Check uniqueness across "parameters" and "fixedOperationParameters"
    params.forEach((param, paramIndex) => {
      const fixedParam = fixedParams.find((p) => p.in === param.in && p.name === param.name);
      if (fixedParam) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Parameter "${param.name}" in "${param.in}" is used in both "parameters" and "fixedOperationParameters"`,
          path: ['ois', 'endpoints', oisIndex, 'parameters', paramIndex],
        });

        // Add also an issue for the fixed parameter. This makes it easier for the user to find the offending parameter
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Parameter "${param.name}" in "${param.in}" is used in both "parameters" and "fixedOperationParameters"`,
          path: ['ois', 'endpoints', oisIndex, 'fixedOperationParameters', fixedParams.indexOf(fixedParam)],
        });
      }
    });
  });
};

const ensureEndpointAndApiSpecificationParamsMatch: SuperRefinement<{
  endpoints: Endpoint[];
  apiSpecifications: ApiSpecification;
}> = (ois, ctx) => {
  const { apiSpecifications, endpoints } = ois;

  // Ensure every "apiSpecification.paths" parameter is defined in "endpoints"
  forEach(apiSpecifications.paths, (pathData, rawPath) => {
    forEach(pathData, (paramData, httpMethod) => {
      const apiEndpoints = endpoints.filter(
        ({ operation }) => operation.method === httpMethod && operation.path === rawPath
      );
      if (!apiEndpoints.length) return; // Missing endpoint for apiSpecification should only be a warning

      apiEndpoints.forEach((endpoint) => {
        paramData!.parameters.forEach((apiParam) => {
          const allEndpointParams = [...endpoint.parameters, ...endpoint.fixedOperationParameters];
          const endpointParam = allEndpointParams.find(
            ({ operationParameter }) =>
              operationParameter.in === apiParam.in && operationParameter.name === apiParam.name
          );
          if (!endpointParam) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Parameter "${apiParam.name}" not found in "fixedOperationParameters" or "parameters"`,
              path: ['ois', 'endpoints', endpoints.indexOf(endpoint)],
            });
          }
        });
      });
    });
  });

  // Ensure every endpoint parameter references parameter from "apiSpecification.paths"
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

    // Ensure every parameter exist in "apiSpecification"
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

    // Ensure every fixed parameter exist in "apiSpecification"
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
            path: ['ois', 'endpoints', endpointIndex, 'fixedOperationParameters', endpointParamIndex],
          });
        }
      }
    });
  });
};

export const semverSchema = z.string().refine((value) => {
  const semver = value.split('.');
  if (semver.length !== 3) return false;

  return !semver.find((part) => /^\d+$/.test(part) === false);
}, 'Expected semantic versioning "x.y.z"');

export const oisSchema = z
  .object({
    oisFormat: semverSchema,
    // Limit the title to 64 characters
    title: z.string().regex(/^[a-zA-Z0-9-_\s]{1,64}$/),
    version: semverSchema,
    apiSpecifications: apiSpecificationSchema,
    endpoints: z.array(endpointSchema),
  })
  .strict()
  .superRefine(ensureSingleParameterUsagePerEndpoint)
  .superRefine(ensureEndpointAndApiSpecificationParamsMatch);

export const RESERVED_PARAMETERS = reservedParameterNameSchema.options.map((option) => option.value);
export type Paths = SchemaType<typeof pathsSchema>;
export type ParameterTarget = SchemaType<typeof parameterTargetSchema>;
export type FixedParameter = SchemaType<typeof fixedParameterSchema>;
export type EndpointParameter = SchemaType<typeof endpointParameterSchema>;
export type HttpSecurityScheme = SchemaType<typeof httpSecuritySchemeSchema>;
export type ConfigurableSecurityScheme = SchemaType<typeof configurableSecuritySchemeSchema>;
export type ApiSpecification = SchemaType<typeof apiSpecificationSchema>;
export type ApiSecurityScheme = SchemaType<typeof apiSecuritySchemeSchema>;
export type ApiKeySecurityScheme = SchemaType<typeof apiKeySecuritySchemeSchema>;
export type ProcessingSpecification = SchemaType<typeof processingSpecificationSchema>;
export type ReservedParameterName = SchemaType<typeof reservedParameterNameSchema>;
export type Operation = SchemaType<typeof operationSchema>;
export type Method = SchemaType<typeof methodSchema>;
export type Endpoint = SchemaType<typeof endpointSchema>;
export type OIS = SchemaType<typeof oisSchema>;
