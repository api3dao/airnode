import { Endpoint, ProcessingSpecification } from '@api3/ois';
import { go } from '@api3/promise-utils';
import { unsafeEvaluate, unsafeEvaluateAsync } from './unsafe-evaluate';
import { apiCallParametersSchema } from '../validation';
import { PROCESSING_TIMEOUT } from '../constants';
import { ApiCallPayload } from '../types';

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
    inputParameters = Object.entries(inputParameters).reduce((acc, [key, value]) => {
      if (key.startsWith('_')) {
        return acc;
      }
      return { ...acc, [key]: value };
    }, {});
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
    // Add back reserved parameters for the HTTP gateway special case
    parameters = Object.entries(aggregatedApiCall.parameters).reduce((params, [key, value]) => {
      if (key.startsWith('_')) {
        return { ...params, [key]: value };
      }
      return params;
    }, parameters);
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
