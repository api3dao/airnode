import { Endpoint, ProcessingSpecification } from '@api3/airnode-ois';
import { go } from '@api3/airnode-utilities';
import { unsafeEvaluate } from './unsafe-evaluate';
import { apiCallParametersSchema } from '../validation';
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
      preProcessingSpecifications.reduce((input: any, currentValue: ProcessingSpecification) => {
        switch (currentValue.environment) {
          case 'Node 14':
            return unsafeEvaluate(input, currentValue.value);
          default:
            throw new Error(`Environment ${currentValue.environment} is not supported`);
        }
      }, aggregatedApiCall.parameters),
    { retries: 0, timeoutMs: 500 }
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
    () =>
      new Promise((resolve) => {
        resolve(
          postProcessingSpecifications.reduce((input: any, currentValue: ProcessingSpecification) => {
            switch (currentValue.environment) {
              case 'Node 14':
                return unsafeEvaluate(input, currentValue.value);
              default:
                throw new Error(`Environment ${currentValue.environment} is not supported`);
            }
          }, input)
        );
      }),
    { retries: 0, timeoutMs: 500 }
  );

  if (err) {
    throw err;
  }

  return result;
};
