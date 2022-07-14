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

  const goProcessedParameters = await go(
    async () =>
      await preProcessingSpecifications.reduce(
        async (input: Promise<unknown>, currentValue: ProcessingSpecification) => {
          switch (currentValue.environment) {
            case 'Node 14':
              return await unsafeEvaluate(await input, currentValue.value, currentValue.timeoutMs);
            case 'Node 14 async':
              return await unsafeEvaluateAsync(await input, currentValue.value, currentValue.timeoutMs);
            default:
              throw new Error(`Environment ${currentValue.environment} is not supported`);
          }
        },
        Promise.resolve(aggregatedApiCall.parameters)
      ),
    { retries: 0, totalTimeoutMs: PROCESSING_TIMEOUT }
  );

  if (!goProcessedParameters.success) {
    throw goProcessedParameters.error;
  }

  // Let this throw if the processed parameters are invalid
  const parameters = apiCallParametersSchema.parse(goProcessedParameters.data);

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
    async () =>
      await postProcessingSpecifications.reduce(async (input: any, currentValue: ProcessingSpecification) => {
        switch (currentValue.environment) {
          case 'Node 14':
            return await unsafeEvaluate(await input, currentValue.value, currentValue.timeoutMs);
          case 'Node 14 async':
            return await unsafeEvaluateAsync(await input, currentValue.value, currentValue.timeoutMs);
          default:
            throw new Error(`Environment ${currentValue.environment} is not supported`);
        }
      }, input),

    { retries: 0, totalTimeoutMs: PROCESSING_TIMEOUT }
  );

  if (!goResult.success) {
    throw goResult.error;
  }

  return goResult.data;
};
