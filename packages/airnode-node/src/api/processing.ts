import { Endpoint, ProcessingSpecification, RESERVED_PARAMETERS } from '@api3/ois';
import { go } from '@api3/promise-utils';
import { unsafeEvaluate, unsafeEvaluateAsync } from './unsafe-evaluate';
import { apiCallParametersSchema } from '../validation';
import { PROCESSING_TIMEOUT } from '../constants';
import { ApiCallParameters, ApiCallPayload } from '../types';

const reservedParameters = RESERVED_PARAMETERS as string[];

const removeReservedParameters = (parameters: ApiCallParameters): ApiCallParameters => {
  return Object.fromEntries(Object.entries(parameters).filter(([key]) => !reservedParameters.includes(key)));
};

/**
 * Re-inserts reserved parameters from the initial parameters object into the modified parameters object.
 */
const reInsertReservedParameters = (
  initialParameters: ApiCallParameters,
  modifiedParameters: ApiCallParameters
): ApiCallParameters => {
  return Object.entries(initialParameters).reduce(
    (params, [key, value]) => (reservedParameters.includes(key) ? { ...params, [key]: value } : params),
    modifiedParameters
  );
};

export const preProcessApiSpecifications = async (payload: ApiCallPayload): Promise<ApiCallPayload> => {
  const { config, aggregatedApiCall } = payload;
  const { endpointName, oisTitle } = aggregatedApiCall;
  const ois = config.ois.find((o) => o.title === oisTitle)!;
  const { preProcessingSpecifications } = ois.endpoints.find((e) => e.name === endpointName)!;

  if (!preProcessingSpecifications || preProcessingSpecifications.length === 0) {
    return payload;
  }

  let inputParameters = aggregatedApiCall.parameters;
  // The HTTP gateway is a special case for ChainAPI that is not allowed to access reserved parameters
  if (payload.type === 'http-gateway') {
    inputParameters = removeReservedParameters(inputParameters);
  }

  const goProcessedParameters = await go(
    () =>
      preProcessingSpecifications.reduce(async (input: Promise<unknown>, currentValue: ProcessingSpecification) => {
        switch (currentValue.environment) {
          case 'Node':
            return unsafeEvaluate(await input, currentValue.value, currentValue.timeoutMs);
          case 'Node async':
            return unsafeEvaluateAsync(await input, currentValue.value, currentValue.timeoutMs);
          default:
            throw new Error(`Environment ${currentValue.environment} is not supported`);
        }
      }, Promise.resolve(inputParameters)),
    { retries: 0, totalTimeoutMs: PROCESSING_TIMEOUT }
  );

  if (!goProcessedParameters.success) {
    throw goProcessedParameters.error;
  }

  // Let this throw if the processed parameters are invalid
  let parameters = apiCallParametersSchema.parse(goProcessedParameters.data);

  if (payload.type === 'http-gateway') {
    parameters = reInsertReservedParameters(aggregatedApiCall.parameters, parameters);
  }

  return {
    ...payload,
    aggregatedApiCall: {
      ...aggregatedApiCall,
      parameters,
    },
  } as ApiCallPayload;
};

export const postProcessApiSpecifications = async (input: unknown, endpoint: Endpoint) => {
  const { postProcessingSpecifications } = endpoint;

  if (!postProcessingSpecifications || postProcessingSpecifications?.length === 0) {
    return input;
  }

  const goResult = await go(
    () =>
      postProcessingSpecifications.reduce(async (input: any, currentValue: ProcessingSpecification) => {
        switch (currentValue.environment) {
          case 'Node':
            return unsafeEvaluate(await input, currentValue.value, currentValue.timeoutMs);
          case 'Node async':
            return unsafeEvaluateAsync(await input, currentValue.value, currentValue.timeoutMs);
          default:
            throw new Error(`Environment ${currentValue.environment} is not supported`);
        }
      }, Promise.resolve(input)),

    { retries: 0, totalTimeoutMs: PROCESSING_TIMEOUT }
  );

  if (!goResult.success) {
    throw goResult.error;
  }

  return goResult.data;
};
