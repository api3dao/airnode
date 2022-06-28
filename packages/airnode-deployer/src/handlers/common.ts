import { Config, endpointIdSchema, apiCallParametersSchema, ApiCallParameters } from '@api3/airnode-node';
import { decode } from '@api3/airnode-abi';
import find from 'lodash/find';
import { z } from 'zod';
import { goSync } from '@api3/promise-utils';

export type VerificationSuccess<T> = T & {
  success: true;
};

export type VerificationFailure = {
  success: false;
  statusCode: number;
  error: string;
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
      error: JSON.stringify({ message: 'Invalid query parameters' }),
    };
  }

  const trigger = find(config.triggers.http, ['endpointId', endpointId]);
  if (!trigger) {
    return { success: false, statusCode: 400, error: `Unable to find endpoint with ID:'${endpointId}'` };
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
      error: JSON.stringify({ message: 'Invalid request body' }),
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
  if (!decodedParameters) {
    return {
      success: false,
      statusCode: 400,
      error: JSON.stringify({ message: `Request contains invalid encodedParameters: ${encodedParameters}` }),
    };
  }

  const endpointIdVerification = verifyEndpointId(config, endpointId);
  if (!endpointIdVerification.success) return endpointIdVerification;
  const validEndpointId = endpointIdVerification.data;

  return { success: true, encodedParameters, endpointId: validEndpointId };
}
