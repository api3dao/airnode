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

function verifyBody<T>(schema: z.Schema<T>, body: unknown): VerificationResult<z.SafeParseSuccess<T>> {
  const parsedBody = schema.safeParse(body);
  if (!parsedBody.success) {
    return {
      success: false,
      // This error and status code is returned by AWS gateway when the request does not match the openAPI
      // specification. We want the same error to be returned by the GCP gateway.
      statusCode: 400,
      error: JSON.stringify({ message: 'Invalid request body' }),
    };
  }

  return parsedBody;
}

function verifyQueryParams<T>(schema: z.Schema<T>, queryParams: unknown): VerificationResult<z.SafeParseSuccess<T>> {
  const parsedQueryParams = schema.safeParse(queryParams);
  if (!parsedQueryParams.success) {
    return {
      success: false,
      // Both GCP and AWS gateway throw custom error messages when the "endpointId" is missing completely. This error is
      // only thrown when the endpoint ID of the request does not match the endpoint ID schema.
      statusCode: 400,
      error: JSON.stringify({ message: 'Invalid query parameters' }),
    };
  }

  return parsedQueryParams;
}

const httpRequestBodySchema = z
  .object({
    parameters: apiCallParametersSchema,
  })
  // TODO: Do we want to be strict here? (AWS doesn't mind this, but we can be stricter)
  .strict();

const httpRequestQueryParamsSchema = z
  .object({ endpointId: endpointIdSchema })
  // TODO: Do we want to be strict here? (Not sure whether there are no extranous properties in the cloud provider
  // query object)
  .strict();

export interface HttpRequestData {
  parameters: ApiCallParameters;
  endpointId: string;
}

export function verifyHttpRequest(
  config: Config,
  body: unknown,
  queryParams: unknown
): VerificationResult<HttpRequestData> {
  const bodyVerification = verifyBody(httpRequestBodySchema, body);
  if (!bodyVerification.success) return bodyVerification;
  const { parameters } = bodyVerification.data;

  const queryParamsVerification = verifyQueryParams(httpRequestQueryParamsSchema, queryParams);
  if (!queryParamsVerification.success) return queryParamsVerification;
  const { endpointId } = queryParamsVerification.data;

  const trigger = find(config.triggers.http, ['endpointId', endpointId]);
  if (!trigger) {
    return { success: false, statusCode: 400, error: `Unable to find endpoint with ID:'${endpointId}'` };
  }

  return { success: true, parameters, endpointId };
}

export interface HttpSignedDataRequestData {
  encodedParameters: string;
  endpointId: string;
}

const httpSignedDataBodySchema = z
  .object({
    encodedParameters: z.string(),
  })
  // TODO: Do we want to be strict here? (AWS doesn't mind this, but we can be stricter)
  .strict();

const httpSignedDataQueryParamsSchema = z
  .object({ endpointId: endpointIdSchema })
  // TODO: Do we want to be strict here? (Not sure whether there are no extranous properties in the cloud provider
  // query object)
  .strict();

export function verifyHttpSignedDataRequest(
  config: Config,
  body: unknown,
  queryParams: unknown
): VerificationResult<HttpSignedDataRequestData> {
  const bodyVerification = verifyBody(httpSignedDataBodySchema, body);
  if (!bodyVerification.success) return bodyVerification;
  const { encodedParameters } = bodyVerification.data;

  // Ensure the encoded parameters are valid. We do it outside of the schema because we want to return a custom error
  const decodedParameters = goSync(() => decode(encodedParameters));
  if (!decodedParameters) {
    return {
      success: false,
      statusCode: 400,
      error: JSON.stringify({ message: `Request contains invalid encodedParameters: ${encodedParameters}` }),
    };
  }

  const queryParamsVerification = verifyQueryParams(httpSignedDataQueryParamsSchema, queryParams);
  if (!queryParamsVerification.success) return queryParamsVerification;
  const { endpointId } = queryParamsVerification.data;

  const trigger = find(config.triggers.httpSignedData, ['endpointId', endpointId]);
  if (!trigger) {
    return { success: false, statusCode: 400, error: `Unable to find endpoint with ID:'${endpointId}'` };
  }

  return { success: true, encodedParameters, endpointId };
}
