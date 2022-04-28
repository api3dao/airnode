import { Endpoint, ProcessingSpecification } from '@api3/airnode-ois';
import { go } from '@api3/airnode-utilities';
import { unsafeEvaluate, unsafeEvaluateAsync } from './unsafe-evaluate';
import { apiCallParametersSchema } from '../validation';
import { PROCESSING_TIMEOUT } from '../constants';
import { CallApiPayload } from './index';

export const preProcessApiSpecifications = async (payload: CallApiPayload): Promise<CallApiPayload> => {
  const { config, aggregatedApiCall } = payload;
  const { endpointName, oisTitle } = aggregatedApiCall;
  const ois = config.ois.find((o) => o.title === oisTitle)!;
  const { preProcessingSpecifications } = ois.endpoints.find((e) => e.name === endpointName)!;

  if (!preProcessingSpecifications || preProcessingSpecifications.length === 0) {
    return payload;
  }

  const [err, processedParameters] = await go(
    async () =>
      await preProcessingSpecifications.reduce(async (input: Promise<unknown>, currentValue: ProcessingSpecification) => {
        switch (currentValue.environment) {
          case 'Node 14':
            return await unsafeEvaluate(await input, currentValue.value, currentValue.timeoutMs);
          case 'Node 14 async':
            return await unsafeEvaluateAsync(await input, currentValue.value, currentValue.timeoutMs);
          default:
            throw new Error(`Environment ${currentValue.environment} is not supported`);
        }
      }, Promise.resolve(aggregatedApiCall.parameters)),
    { retries: 0, timeoutMs: PROCESSING_TIMEOUT }
  );

  if (err) {
    throw err;
  }

  // Let this throw if the processed parameters are invalid
  const parameters = apiCallParametersSchema.parse(processedParameters);

  return {
    ...payload,
    aggregatedApiCall: {
      ...aggregatedApiCall,
      parameters,
    },
  };
};

export const postProcessApiSpecifications = async (input: unknown, endpoint: Endpoint) => {
  const { postProcessingSpecifications } = endpoint;

  if (!postProcessingSpecifications || postProcessingSpecifications?.length === 0) {
    return input;
  }

  const [err, result] = await go(
    async () =>
      await postProcessingSpecifications.reduce(async (input: any, currentValue: ProcessingSpecification) => {
        switch (currentValue.environment) {
          case 'Node 14':
            return await unsafeEvaluate(await input, currentValue.value, currentValue.timeoutMs);
          case 'Node 14 async':
            return await unsafeEvaluate(await input, currentValue.value, currentValue.timeoutMs);
          default:
            throw new Error(`Environment ${currentValue.environment} is not supported`);
        }
      }, input),

    { retries: 0, timeoutMs: PROCESSING_TIMEOUT }
  );

  if (err) {
    throw err;
  }

  return result;
};
