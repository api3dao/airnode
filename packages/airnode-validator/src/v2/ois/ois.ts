import { z } from 'zod';

export const paremeterTargetSchema = z.union([
  z.literal('path'),
  z.literal('query'),
  z.literal('header'),
  z.literal('cookie'),
]);

export const operationParameterSchema = z.object({
  in: paremeterTargetSchema,
  name: z.string(),
});

export const fixedParameterSchema = z.object({
  operationParameter: operationParameterSchema,
  value: z.string(),
});

export const endpointOperationSchema = z.object({
  method: z.union([z.literal('get'), z.literal('post')]),
  path: z.string(),
});

export const endpointParameterSchema = z.object({
  default: z.string().optional(),
  description: z.string().optional(),
  example: z.string().optional(),
  name: z.string(),
  operationParameter: operationParameterSchema,
  required: z.boolean().optional(),
});

export const reservedParameterNameSchema = z.union([z.literal('_type'), z.literal('_path'), z.literal('_times')]);

export const reservedParameterSchema = z.object({
  default: z.string().optional(),
  fixed: z.string().optional(),
  name: reservedParameterNameSchema,
});

// TODO: Implement
export const apiSpecificationSchema = z.any();

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

export const oisSchema = z.object({
  oisFormat: z.string(),
  title: z.string(),
  version: z.string(),
  apiSpecifications: apiSpecificationSchema,
  endpoints: z.array(endpointSchema),
});
