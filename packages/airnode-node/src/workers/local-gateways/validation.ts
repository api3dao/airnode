import { decode } from '@api3/airnode-abi';
import find from 'lodash/find';
import { z } from 'zod';
import { goSync } from '@api3/promise-utils';
import { ApiCallParameters } from '../../types';
import { Config, endpointIdSchema } from '../../config';
import { apiCallParametersSchema } from '../../validation';

export type VerificationSuccess<T> = T & {
  success: true;
};

export type VerificationFailure = {
  success: false;
  statusCode: number;
  error: { message: string };
};

export type VerificationResult<T> = VerificationSuccess<T> | VerificationFailure;

function verifyEndpointId(config: Config, endpointId: unknown): VerificationResult<z.SafeParseSuccess<string>> {
  const parsedEndpointId = endpointIdSchema.safeParse(endpointId);
  if (!parsedEndpointId.success) {
    return {
      success: false,
      // Both GCP and AWS gateway throw custom error messages when the "endpointId" is missing completely. This error is
      // only thrown when the endpoint ID of the request does not match the endpoint ID schema.
      statusCode: 400,
      error: { message: 'Invalid query parameters' },
    };
  }

  const trigger = find(config.triggers.http, ['endpointId', endpointId]);
  if (!trigger) {
    return {
      success: false,
      statusCode: 400,
      error: { message: `Unable to find endpoint with ID:'${endpointId}'` },
    };
  }

  return parsedEndpointId;
}

export interface HttpRequestData {
  parameters: ApiCallParameters;
  endpointId: string;
}

export function verifyHttpRequest(
  config: Config,
  parameters: unknown,
  endpointId: string
): VerificationResult<HttpRequestData> {
  const parametersValidation = apiCallParametersSchema.safeParse(parameters);
  if (!parametersValidation.success) {
    return {
      success: false,
      // This error and status code is returned by AWS gateway when the request does not match the openAPI
      // specification. We want the same error to be returned by the GCP gateway.
      statusCode: 400,
      error: { message: 'Invalid request body' },
    };
  }
  const validParameters = parametersValidation.data;

  const endpointIdValidation = verifyEndpointId(config, endpointId);
  if (!endpointIdValidation.success) return endpointIdValidation;
  const validEndpointId = endpointIdValidation.data;

  return { success: true, parameters: validParameters, endpointId: validEndpointId };
}

export interface HttpSignedDataRequestData {
  encodedParameters: string;
  endpointId: string;
}

export function verifyHttpSignedDataRequest(
  config: Config,
  encodedParameters: string,
  endpointId: string
): VerificationResult<HttpSignedDataRequestData> {
  // Ensure the encoded parameters are valid. We do it outside of the schema because we want to return a custom error
  const decodedParameters = goSync(() => decode(encodedParameters));
  if (!decodedParameters.success) {
    return {
      success: false,
      statusCode: 400,
      error: { message: `Request contains invalid encodedParameters: ${encodedParameters}` },
    };
  }

  const endpointIdVerification = verifyEndpointId(config, endpointId);
  if (!endpointIdVerification.success) return endpointIdVerification;
  const validEndpointId = endpointIdVerification.data;

  return { success: true, encodedParameters, endpointId: validEndpointId };
}

export const checkRequestOrigin = (allowedOrigins: string[], origin?: string) =>
  allowedOrigins.find((allowedOrigin) => allowedOrigin === '*') ||
  (origin && allowedOrigins.find((allowedOrigin) => allowedOrigin === origin));

export const buildCorsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'OPTIONS,POST',
  'Access-Control-Allow-Headers': 'Content-Type,x-api-key',
});

export const verifyRequestOrigin = (allowedOrigins: string[], origin?: string) => {
  const allowedOrigin = checkRequestOrigin(allowedOrigins, origin);

  // Return CORS headers to be used by the response if the origin is allowed
  if (allowedOrigin) return { success: true, headers: buildCorsHeaders(allowedOrigin) };

  return { success: false, error: { message: 'CORS origin verification failed.' } };
};
