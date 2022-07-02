import * as adapter from '@api3/airnode-adapter';
import { RESERVED_PARAMETERS } from '@api3/airnode-ois';
import { ethers } from 'ethers';
import { logger, removeKeys, removeKey } from '@api3/airnode-utilities';
import { go, goSync } from '@api3/promise-utils';
import { postProcessApiSpecifications, preProcessApiSpecifications } from './processing';
import { getMasterHDNode, getAirnodeWalletFromPrivateKey } from '../evm';
import { getReservedParameters } from '../adapters/http/parameters';
import { API_CALL_TIMEOUT, API_CALL_TOTAL_TIMEOUT } from '../constants';
import { isValidSponsorWallet, isValidRequestId } from '../evm/verification';
import { getExpectedTemplateIdV0, getExpectedTemplateIdV1 } from '../evm/templates';
import {
  AggregatedApiCall,
  ApiCallResponse,
  LogsData,
  RequestErrorMessage,
  ApiCallErrorResponse,
  ApiCallParameters,
} from '../types';
import { Config, getEnvValue } from '../config';

function buildOptions(payload: CallApiPayload): adapter.BuildRequestOptions {
  const { config, aggregatedApiCall } = payload;
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

  switch (aggregatedApiCall.type) {
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
      const { airnodeAddress, requesterAddress, sponsorAddress, sponsorWalletAddress, endpointId, id, chainId } =
        aggregatedApiCall;
      // Find the chain config based on the aggregatedApiCall chainId
      const chain = config.chains.find((c) => c.id === chainId)!;

      return {
        endpointName,
        parameters: sanitizedParameters,
        ois,
        apiCredentials,
        metadata: {
          airnodeAddress: airnodeAddress,
          requesterAddress: requesterAddress,
          sponsorAddress: sponsorAddress,
          sponsorWalletAddress: sponsorWalletAddress,
          endpointId: endpointId,
          requestId: id,
          chainId: chainId,
          chainType: chain.type,
          airnodeRrpAddress: chain.contracts.AirnodeRrp,
        },
      };
    }
  }
}

async function signWithRequestId(requestId: string, data: string) {
  const airnodeWalletPrivateKey = getEnvValue('AIRNODE_WALLET_PRIVATE_KEY');
  if (!airnodeWalletPrivateKey) {
    throw new Error('Missing Airnode wallet private key in environment variables.');
  }
  const airnodeWallet = getAirnodeWalletFromPrivateKey(airnodeWalletPrivateKey);

  return await airnodeWallet.signMessage(
    ethers.utils.arrayify(
      ethers.utils.keccak256(ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, data || '0x']))
    )
  );
}

async function signWithTemplateId(templateId: string, timestamp: string, data: string) {
  const airnodeWalletPrivateKey = getEnvValue('AIRNODE_WALLET_PRIVATE_KEY');
  if (!airnodeWalletPrivateKey) {
    throw new Error('Missing Airnode wallet private key in environment variables.');
  }
  const airnodeWallet = getAirnodeWalletFromPrivateKey(airnodeWalletPrivateKey);

  return await airnodeWallet.signMessage(
    ethers.utils.arrayify(
      ethers.utils.keccak256(
        ethers.utils.solidityPack(['bytes32', 'uint256', 'bytes'], [templateId, timestamp, data || '0x'])
      )
    )
  );
}

export interface CallApiPayload {
  readonly config: Config;
  readonly aggregatedApiCall: AggregatedApiCall;
}

function verifySponsorWallet(payload: CallApiPayload): LogsData<ApiCallErrorResponse> | null {
  const { config, aggregatedApiCall } = payload;
  if (aggregatedApiCall.type !== 'regular') return null;

  const { sponsorAddress, sponsorWalletAddress, id } = aggregatedApiCall;
  const hdNode = getMasterHDNode(config);
  if (isValidSponsorWallet(hdNode, sponsorAddress, sponsorWalletAddress)) return null;

  // TODO: Abstract this to a logging utils file
  const message = `${RequestErrorMessage.SponsorWalletInvalid}, Request ID:${id}`;
  const log = logger.pend('ERROR', message);
  return [
    [log],
    {
      success: false,
      errorMessage: message,
    },
  ];
}

function verifyRequestId(payload: CallApiPayload): LogsData<ApiCallErrorResponse> | null {
  const { aggregatedApiCall } = payload;
  if (aggregatedApiCall.type !== 'regular') return null;

  if (isValidRequestId(aggregatedApiCall)) return null;

  const message = `${RequestErrorMessage.RequestIdInvalid}. Request ID:${aggregatedApiCall.id}`;
  const log = logger.pend('ERROR', message);
  return [
    [log],
    {
      success: false,
      errorMessage: message,
    },
  ];
}

export function verifyTemplateId(payload: CallApiPayload): LogsData<ApiCallErrorResponse> | null {
  const { aggregatedApiCall } = payload;

  if (aggregatedApiCall.type === 'http-gateway') return null;

  const { templateId, template, id } = aggregatedApiCall;
  if (!templateId) {
    return null;
  }

  if (!template) {
    const message = `Ignoring Request:${id} as the template could not be found for verification`;
    const log = logger.pend('ERROR', message);
    return [
      [log],
      {
        success: false,
        errorMessage: message,
      },
    ];
  }

  const expectedTemplateId =
    aggregatedApiCall.type === 'http-signed-data-gateway'
      ? getExpectedTemplateIdV1(template)
      : getExpectedTemplateIdV0(template);

  if (templateId === expectedTemplateId) return null;

  const message = `Invalid template ID:${templateId} found for Request:${id}. Expected template ID:${expectedTemplateId}`;
  const log = logger.pend('ERROR', message);
  return [[log], { success: false, errorMessage: message }];
}

function verifyCallApiPayload(payload: CallApiPayload) {
  const verifications = [verifySponsorWallet, verifyRequestId, verifyTemplateId];

  return verifications.reduce((result, verifierFn) => {
    if (result) return result;
    return verifierFn(payload);
  }, null as LogsData<ApiCallErrorResponse> | null);
}

interface PerformApiCallSuccess {
  data: unknown;
}

function isPerformApiCallFailure(value: ApiCallErrorResponse | PerformApiCallSuccess): value is ApiCallErrorResponse {
  return !!(value as ApiCallErrorResponse).errorMessage;
}

async function performApiCall(
  payload: CallApiPayload
): Promise<LogsData<ApiCallErrorResponse | PerformApiCallSuccess>> {
  const options = buildOptions(payload);
  // Each API call is allowed API_CALL_TIMEOUT ms to complete, before it is retried until the
  // maximum timeout is reached.
  const adapterConfig: adapter.Config = { timeout: API_CALL_TIMEOUT };
  // If the request times out, we attempt to call the API again. Any other errors will not result in retries
  const goRes = await go(() => adapter.buildAndExecuteRequest(options, adapterConfig), {
    totalTimeoutMs: API_CALL_TOTAL_TIMEOUT,
  });
  if (!goRes.success) {
    const { aggregatedApiCall } = payload;
    const log = logger.pend('ERROR', `Failed to call Endpoint:${aggregatedApiCall.endpointName}`, goRes.error);
    return [[log], { success: false, errorMessage: `${RequestErrorMessage.ApiCallFailed}` }];
  }

  return [[], { ...goRes.data }];
}

async function processSuccessfulApiCall(
  payload: CallApiPayload,
  rawResponse: PerformApiCallSuccess
): Promise<LogsData<ApiCallResponse>> {
  const { config, aggregatedApiCall } = payload;
  const { endpointName, oisTitle, parameters } = aggregatedApiCall;
  const ois = config.ois.find((o) => o.title === oisTitle)!;
  const endpoint = ois.endpoints.find((e) => e.name === endpointName)!;
  const reservedParameters = getReservedParameters(endpoint, parameters);

  const goPostProcessApiSpecifications = await go(() => postProcessApiSpecifications(rawResponse.data, endpoint));
  if (!goPostProcessApiSpecifications.success) {
    const log = logger.pend('ERROR', goPostProcessApiSpecifications.error.message);
    return [[log], { success: false, errorMessage: goPostProcessApiSpecifications.error.message }];
  }

  const goExtractAndEncodeResponse = goSync(() =>
    adapter.extractAndEncodeResponse(
      goPostProcessApiSpecifications.data,
      reservedParameters as adapter.ReservedParameters
    )
  );
  if (!goExtractAndEncodeResponse.success) {
    const log = logger.pend('ERROR', goExtractAndEncodeResponse.error.message);
    return [[log], { success: false, errorMessage: goExtractAndEncodeResponse.error.message }];
  }

  const response = goExtractAndEncodeResponse.data;

  switch (aggregatedApiCall.type) {
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
        { success: true, data: { encodedValue: response.encodedValue, signature: goSignWithRequestId.data } },
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

export async function callApi(payload: CallApiPayload): Promise<LogsData<ApiCallResponse>> {
  const verificationResult = verifyCallApiPayload(payload);
  if (verificationResult) return verificationResult;

  const processedPayload = await preProcessApiSpecifications(payload);

  const [logs, response] = await performApiCall(processedPayload);
  if (isPerformApiCallFailure(response)) {
    return [logs, response];
  }

  return processSuccessfulApiCall(payload, response);
}
