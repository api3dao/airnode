import * as adapter from '@api3/airnode-adapter';
import isEmpty from 'lodash/isEmpty';
import { OIS, RESERVED_PARAMETERS, Endpoint } from '@api3/ois';
import { logger, removeKeys, removeKey } from '@api3/airnode-utilities';
import { go, goSync } from '@api3/promise-utils';
import axios, { AxiosError } from 'axios';
import { ethers } from 'ethers';
import compact from 'lodash/compact';
import { postProcessApiSpecifications, preProcessApiSpecifications } from './processing';
import { getAirnodeWalletFromPrivateKey, deriveSponsorWalletFromMnemonic } from '../evm';
import { getReservedParameters } from '../adapters/http/parameters';
import { API_CALL_TIMEOUT, BLOCK_COUNT_HISTORY_LIMIT } from '../constants';
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
  RegularAggregatedApiCall,
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

export function verifySponsorWallet(payload: RegularApiCallPayload): LogsData<ApiCallErrorResponse> | null {
  const { config, aggregatedApiCall } = payload;

  const { sponsorAddress, sponsorWalletAddress, id } = aggregatedApiCall;
  const derivedSponsorWallet = deriveSponsorWalletFromMnemonic(
    config.nodeSettings.airnodeWalletMnemonic,
    sponsorAddress
  );
  if (derivedSponsorWallet.address === sponsorWalletAddress) return null;

  // TODO: Abstract this to a logging utils file
  const message = `${RequestErrorMessage.SponsorWalletInvalid}, Request ID:${id}`;
  const log = logger.pend('ERROR', message);
  return [[log], { success: false, errorMessage: message }];
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
  const verifications = [verifySponsorWallet, verifyRequestId, verifyTemplateId];

  return verifications.reduce((result, verifierFn) => {
    if (result) return result;
    return verifierFn(payload);
  }, null as LogsData<ApiCallErrorResponse> | null);
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
  const timeout = API_CALL_TIMEOUT;
  // We also pass the timeout to adapter to gracefully abort the request after the timeout
  const goRes = await go(() => adapter.buildAndExecuteRequest(options, { timeout }), {
    totalTimeoutMs: timeout,
  });
  if (!goRes.success) {
    const { aggregatedApiCall } = payload;
    const log = logger.pend('ERROR', `Failed to call Endpoint:${aggregatedApiCall.endpointName}`, goRes.error);
    // eslint-disable-next-line import/no-named-as-default-member
    const axiosErrorMsg = axios.isAxiosError(goRes.error) ? errorMsgFromAxiosError(goRes.error) : '';
    const errorMessage = compact([RequestErrorMessage.ApiCallFailed, axiosErrorMsg]).join(' ');
    return [[log], { success: false, errorMessage: errorMessage }];
  }

  return [[], { ...goRes.data }];
}

export async function processSuccessfulApiCall(
  payload: ApiCallPayload,
  rawResponse: PerformApiCallSuccess
): Promise<LogsData<ApiCallResponse>> {
  const { type, config, aggregatedApiCall } = payload;
  const { endpointName, oisTitle, parameters } = aggregatedApiCall;
  const ois = config.ois.find((o) => o.title === oisTitle)!;
  const endpoint = ois.endpoints.find((e) => e.name === endpointName)!;
  const { _type, _path, _times, _gasPrice, _minConfirmations } = getReservedParameters(endpoint, parameters);

  const goPostProcessApiSpecifications = await go(() => postProcessApiSpecifications(rawResponse.data, endpoint));
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

      if (_minConfirmations) {
        const numMinConfirmations = Number(_minConfirmations);

        if (isNaN(numMinConfirmations) || !Number.isInteger(numMinConfirmations)) {
          const msg = `Parameter "_minConfirmations" value ${numMinConfirmations} could not be parsed as an integer`;
          const log = logger.pend('ERROR', msg);
          return [[log], { success: false, errorMessage: msg }];
        }
        if (numMinConfirmations > BLOCK_COUNT_HISTORY_LIMIT) {
          const msg = `Parameter "_minConfirmations" value ${numMinConfirmations} cannot be greater than BLOCK_COUNT_HISTORY_LIMIT value ${BLOCK_COUNT_HISTORY_LIMIT}`;
          const log = logger.pend('ERROR', msg);
          return [[log], { success: false, errorMessage: msg }];
        }

        // filter requests based on _minConfirmations requested relative to number of block confirmations
        if (aggregatedApiCall.metadata.currentBlock - aggregatedApiCall.metadata.blockNumber < numMinConfirmations) {
          const msg = `Dropping Request ID:${aggregatedApiCall.id} as it hasn't had ${numMinConfirmations} block confirmations`;
          const log = logger.pend('INFO', msg);
          return [[log], { success: false, errorMessage: msg }];
        }
      } else if (!isEmpty(config.chains)) {
        // filter requests based on chains[n].minConfirmations relative to number of block confirmations
        const { chainId } = aggregatedApiCall as RegularAggregatedApiCall;
        const configMinConfirmations = Number(config.chains.find((c) => c.id === chainId)!.minConfirmations);
        if (aggregatedApiCall.metadata.currentBlock - aggregatedApiCall.metadata.blockNumber < configMinConfirmations) {
          const msg = `Dropping Request ID:${aggregatedApiCall.id} as it hasn't had ${configMinConfirmations} block confirmations`;
          const log = logger.pend('INFO', msg);
          return [[log], { success: false, errorMessage: msg }];
        }
      }

      return [
        [],
        {
          success: true,
          data: { encodedValue: response.encodedValue, signature: goSignWithRequestId.data },
          reservedParameterOverrides:
            _gasPrice || _minConfirmations ? { gasPrice: _gasPrice, minConfirmations: _minConfirmations } : undefined,
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

  const processedPayload = await preProcessApiSpecifications(payload);
  const ois = payload.config.ois.find((o: OIS) => o.title === payload.aggregatedApiCall.oisTitle)!;
  const endpoint = ois.endpoints.find((e: Endpoint) => e.name === payload.aggregatedApiCall.endpointName)!;

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
    return processSuccessfulApiCall(payload, { data: processedPayload.aggregatedApiCall.parameters });
  }

  const [logs, response] = await performApiCall(processedPayload);
  if (isPerformApiCallFailure(response)) {
    return [logs, response];
  }
  return processSuccessfulApiCall(payload, response);
}
