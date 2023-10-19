import * as adapter from '@api3/airnode-adapter';
import isEmpty from 'lodash/isEmpty';
import { RESERVED_PARAMETERS } from '@api3/ois';
import { preProcessApiCallParameters, postProcessApiCallResponse } from '@api3/commons';
import { logger, removeKeys, removeKey } from '@api3/airnode-utilities';
import { go, goSync } from '@api3/promise-utils';
import axios, { AxiosError } from 'axios';
import { ethers } from 'ethers';
import compact from 'lodash/compact';
import { getAirnodeWalletFromPrivateKey } from '../evm';
import { getReservedParameters } from '../adapters/http/parameters';
import { FIRST_API_CALL_TIMEOUT, PROCESSING_TIMEOUT, SECOND_API_CALL_TIMEOUT } from '../constants';
import { isValidRequestId } from '../evm/verification';
import { getExpectedTemplateIdV0, getExpectedTemplateIdV1 } from '../evm/templates';
import {
  ApiCallResponse,
  LogsData,
  RequestErrorMessage,
  ApiCallErrorResponse,
  ApiCallParameters,
  ApiCallPayload,
  RegularApiCallPayload,
  HttpSignedApiCallPayload,
} from '../types';

export function buildOptions(payload: ApiCallPayload): adapter.BuildRequestOptions {
  const { type, config, aggregatedApiCall } = payload;
  const { endpointName, parameters, oisTitle } = aggregatedApiCall;

  const ois = config.ois.find((o) => o.title === oisTitle)!;
  const apiCredentials = config.apiCredentials
    .filter((c) => c.oisTitle === oisTitle)
    .map((c) => removeKey(c, 'oisTitle')) as adapter.BaseApiCredentials[];

  // Gather the default endpoint parameter values
  const endpoint = ois.endpoints.find((endpoint) => endpoint.name === endpointName)!;
  const defaultParameters = endpoint.parameters
    .filter((p) => p.default !== undefined)
    .reduce((acc, p) => ({ ...acc, [p.name]: p.default! }), {} as ApiCallParameters);

  // Override (and merge) the default endpoint parameters with the user parameters
  const allParameters = { ...defaultParameters, ...parameters };

  // Don't submit the reserved parameters to the API
  const sanitizedParameters: adapter.Parameters = removeKeys(allParameters, RESERVED_PARAMETERS);

  switch (type) {
    case 'http-signed-data-gateway':
    case 'http-gateway': {
      return {
        endpointName,
        parameters: sanitizedParameters,
        ois,
        apiCredentials,
        metadata: null,
      };
    }
    case 'regular': {
      const { requesterAddress, sponsorAddress, sponsorWalletAddress, id, chainId } = aggregatedApiCall;

      // Find the chain config based on the aggregatedApiCall chainId
      const chain = config.chains.find((c) => c.id === chainId);

      return {
        endpointName,
        parameters: sanitizedParameters,
        ois,
        apiCredentials,
        metadata: {
          requesterAddress: requesterAddress,
          sponsorAddress: sponsorAddress,
          sponsorWalletAddress: sponsorWalletAddress,
          requestId: id,
          chainId: chainId,
          chainType: chain?.type || 'evm',
        },
      };
    }
  }
}

export function signWithRequestId(requestId: string, data: string) {
  const airnodeWallet = getAirnodeWalletFromPrivateKey();

  return airnodeWallet.signMessage(
    ethers.utils.arrayify(
      ethers.utils.keccak256(ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data || '0x']))
    )
  );
}

export function signWithTemplateId(templateId: string, timestamp: string, data: string) {
  const airnodeWallet = getAirnodeWalletFromPrivateKey();

  return airnodeWallet.signMessage(
    ethers.utils.arrayify(
      ethers.utils.keccak256(
        ethers.utils.solidityPack(['bytes32', 'uint256', 'bytes'], [templateId, timestamp, data || '0x'])
      )
    )
  );
}

export function verifyRequestId(payload: RegularApiCallPayload): LogsData<ApiCallErrorResponse> | null {
  const { aggregatedApiCall } = payload;

  if (isValidRequestId(aggregatedApiCall)) return null;

  const message = `${RequestErrorMessage.RequestIdInvalid}. Request ID:${aggregatedApiCall.id}`;
  const log = logger.pend('ERROR', message);
  return [[log], { success: false, errorMessage: message }];
}

export function verifyTemplateId(
  payload: RegularApiCallPayload | HttpSignedApiCallPayload
): LogsData<ApiCallErrorResponse> | null {
  const { type, aggregatedApiCall } = payload;

  const { templateId, template, id } = aggregatedApiCall;
  if (!templateId) {
    return null;
  }

  if (!template) {
    const message = `Ignoring Request:${id} as the template could not be found for verification`;
    const log = logger.pend('ERROR', message);
    return [[log], { success: false, errorMessage: message }];
  }

  const expectedTemplateId =
    type === 'http-signed-data-gateway' ? getExpectedTemplateIdV1(template) : getExpectedTemplateIdV0(template);

  if (templateId === expectedTemplateId) return null;

  const message = `Invalid template ID:${templateId} found for Request:${id}. Expected template ID:${expectedTemplateId}`;
  const log = logger.pend('ERROR', message);
  return [[log], { success: false, errorMessage: message }];
}

export function verifyCallApi(payload: ApiCallPayload) {
  switch (payload.type) {
    case 'regular':
      return verifyRegularCallApiParams(payload);
    case 'http-signed-data-gateway':
      return verifyHttpSignedCallApiParams(payload);
    default:
      return null;
  }
}

export function verifyRegularCallApiParams(payload: RegularApiCallPayload) {
  const verifications = [verifyRequestId, verifyTemplateId];

  return verifications.reduce(
    (result, verifierFn) => {
      if (result) return result;
      return verifierFn(payload);
    },
    null as LogsData<ApiCallErrorResponse> | null
  );
}

export function verifyHttpSignedCallApiParams(payload: HttpSignedApiCallPayload) {
  return verifyTemplateId(payload) as LogsData<ApiCallErrorResponse> | null;
}

export interface PerformApiCallSuccess {
  data: unknown;
}

export function isPerformApiCallFailure(
  value: ApiCallErrorResponse | PerformApiCallSuccess
): value is ApiCallErrorResponse {
  return !!(value as ApiCallErrorResponse).errorMessage;
}

export function errorMsgFromAxiosError(e: AxiosError): string {
  if (e.response) {
    return `with status code ${e.response.status}`;
  } else if (e.request) {
    return 'with no response';
  } else {
    return 'in building the HTTP request';
  }
}

export async function performApiCall(
  payload: ApiCallPayload
): Promise<LogsData<ApiCallErrorResponse | PerformApiCallSuccess>> {
  const options = buildOptions(payload);
  // We also pass the timeout to adapter to gracefully abort the request after the timeout.
  // timeout passed to adapter will cause axios socket to hang until the timeout is reached
  // even if the totalTimeoutMs is reached and the 2nd attempt is made
  const goAttempt1 = await go(() => adapter.buildAndExecuteRequest(options, { timeout: FIRST_API_CALL_TIMEOUT }), {
    totalTimeoutMs: FIRST_API_CALL_TIMEOUT,
  });
  if (goAttempt1.success) {
    return [[], { ...goAttempt1.data }];
  }
  const goAttempt2 = await go(() => adapter.buildAndExecuteRequest(options, { timeout: SECOND_API_CALL_TIMEOUT }), {
    totalTimeoutMs: SECOND_API_CALL_TIMEOUT,
  });
  if (goAttempt2.success) {
    return [[], { ...goAttempt2.data }];
  }
  const { aggregatedApiCall } = payload;
  const log = logger.pend('ERROR', `Failed to call Endpoint:${aggregatedApiCall.endpointName}`, goAttempt2.error);
  // eslint-disable-next-line import/no-named-as-default-member
  const axiosErrorMsg = axios.isAxiosError(goAttempt2.error) ? errorMsgFromAxiosError(goAttempt2.error) : '';
  const errorMessage = compact([RequestErrorMessage.ApiCallFailed, axiosErrorMsg]).join(' ');
  return [[log], { success: false, errorMessage: errorMessage }];
}

export async function processSuccessfulApiCall(
  payload: ApiCallPayload,
  rawResponse: PerformApiCallSuccess
): Promise<LogsData<ApiCallResponse>> {
  const { type, config, aggregatedApiCall } = payload;
  const { endpointName, oisTitle, parameters } = aggregatedApiCall;
  const ois = config.ois.find((o) => o.title === oisTitle)!;
  const endpoint = ois.endpoints.find((e) => e.name === endpointName)!;
  // _minConfirmations is handled prior to the API call
  const { _type, _path, _times, _gasPrice } = getReservedParameters(endpoint, parameters);

  const goPostProcessApiSpecifications = await go(() =>
    postProcessApiCallResponse(rawResponse.data, endpoint, aggregatedApiCall.parameters, {
      totalTimeoutMs: PROCESSING_TIMEOUT,
    })
  );
  if (!goPostProcessApiSpecifications.success) {
    const log = logger.pend('ERROR', goPostProcessApiSpecifications.error.message);
    return [[log], { success: false, errorMessage: goPostProcessApiSpecifications.error.message }];
  }

  const goExtractAndEncodeResponse = goSync(() =>
    adapter.extractAndEncodeResponse(goPostProcessApiSpecifications.data, {
      _type,
      _path,
      _times,
    } as adapter.ResponseReservedParameters)
  );
  if (!goExtractAndEncodeResponse.success) {
    const log = logger.pend('ERROR', goExtractAndEncodeResponse.error.message);
    // The HTTP gateway is a special case for ChainAPI where we return data from a successful API call that failed processing
    if (type === 'http-gateway') {
      return [
        [log],
        { success: true, errorMessage: goExtractAndEncodeResponse.error.message, data: { rawValue: rawResponse.data } },
      ];
    }
    return [[log], { success: false, errorMessage: goExtractAndEncodeResponse.error.message }];
  }

  const response = goExtractAndEncodeResponse.data;

  switch (type) {
    case 'http-gateway':
      return [[], { success: true, data: response }];
    case 'regular': {
      const goSignWithRequestId = await go(() => signWithRequestId(aggregatedApiCall.id, response.encodedValue));
      if (!goSignWithRequestId.success) {
        const log = logger.pend('ERROR', goSignWithRequestId.error.message);
        return [[log], { success: false, errorMessage: goSignWithRequestId.error.message }];
      }

      return [
        [],
        {
          success: true,
          data: { encodedValue: response.encodedValue, signature: goSignWithRequestId.data },
          reservedParameterOverrides: _gasPrice ? { gasPrice: _gasPrice } : undefined,
        },
      ];
    }
    case 'http-signed-data-gateway': {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const goSignWithTemplateId = await go(() =>
        signWithTemplateId(aggregatedApiCall.templateId, timestamp, response.encodedValue)
      );
      if (!goSignWithTemplateId.success) {
        const log = logger.pend('ERROR', goSignWithTemplateId.error.message);
        return [[log], { success: false, errorMessage: goSignWithTemplateId.error.message }];
      }

      return [
        [],
        {
          success: true,
          data: { timestamp, encodedValue: response.encodedValue, signature: goSignWithTemplateId.data },
        },
      ];
    }
  }
}

export async function callApi(payload: ApiCallPayload): Promise<LogsData<ApiCallResponse>> {
  const verificationResult = verifyCallApi(payload);
  if (verificationResult) return verificationResult;

  const {
    aggregatedApiCall: { parameters },
  } = payload;
  const ois = payload.config.ois.find((o) => o.title === payload.aggregatedApiCall.oisTitle)!;
  const endpoint = ois.endpoints.find((e) => e.name === payload.aggregatedApiCall.endpointName)!;
  const processedParameters = await preProcessApiCallParameters(endpoint, parameters, {
    totalTimeoutMs: PROCESSING_TIMEOUT,
  });

  // skip API call if operation is undefined and fixedOperationParameters is empty array
  if (!endpoint.operation && isEmpty(endpoint.fixedOperationParameters)) {
    // contents of preProcessingSpecifications or postProcessingSpecifications (or both) will simulate an API when API call is skipped
    if (isEmpty(endpoint.preProcessingSpecifications) && isEmpty(endpoint.postProcessingSpecifications)) {
      const message = `Failed to skip API call. Ensure at least one of 'preProcessingSpecifications' or 'postProcessingSpecifications' is defined and is not an empty array at ois '${payload.aggregatedApiCall.oisTitle}', endpoint '${payload.aggregatedApiCall.endpointName}'.`;
      const log = logger.pend('ERROR', message);
      return [[log], { success: false, errorMessage: message }];
    }
    // output of preProcessingSpecifications can be used as output directly or
    // preProcessingSpecifications can be used to manipulate parameters to use in postProcessingSpecifications
    return processSuccessfulApiCall(payload, { data: processedParameters });
  }

  const [logs, response] = await performApiCall({
    ...payload,
    aggregatedApiCall: { ...payload.aggregatedApiCall, parameters: processedParameters },
  } as ApiCallPayload);
  if (isPerformApiCallFailure(response)) {
    return [logs, response];
  }
  return processSuccessfulApiCall(payload, response);
}
