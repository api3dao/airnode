import * as adapter from '@api3/airnode-adapter';
import { RESERVED_PARAMETERS } from '@api3/airnode-ois';
import { ethers } from 'ethers';
import { getMasterHDNode } from '../evm';
import { getReservedParameters } from '../adapters/http/parameters';
import { API_CALL_TIMEOUT, API_CALL_TOTAL_TIMEOUT } from '../constants';
import { isValidSponsorWallet } from '../evm/verification';
import * as logger from '../logger';
import {
  AggregatedApiCall,
  ApiCallResponse,
  Config,
  LogsData,
  RequestErrorMessage,
  PendingLog,
  ApiCallErrorResponse,
} from '../types';
import { removeKeys, removeKey } from '../utils/object-utils';
import { go, retryOnTimeout } from '../utils/promise-utils';

function buildOptions(payload: CallApiPayload): adapter.BuildRequestOptions {
  const { config, aggregatedApiCall } = payload;
  const { endpointName, parameters, oisTitle } = aggregatedApiCall;

  // Don't submit the reserved parameters to the API
  const sanitizedParameters: adapter.Parameters = removeKeys(parameters, RESERVED_PARAMETERS);
  const ois = config.ois.find((o) => o.title === oisTitle)!;
  const apiCredentials = config.apiCredentials
    .filter((c) => c.oisTitle === oisTitle)
    .map((c) => removeKey(c, 'oisTitle')) as adapter.ApiCredentials[];

  switch (aggregatedApiCall.type) {
    case 'testing-gateway': {
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

async function signResponseMessage(requestId: string, responseValue: string, config: Config) {
  const masterHDNode = getMasterHDNode(config);
  const airnodeWallet = ethers.Wallet.fromMnemonic(masterHDNode.mnemonic!.phrase);

  return await airnodeWallet.signMessage(
    ethers.utils.arrayify(
      ethers.utils.keccak256(ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, responseValue || '0x']))
    )
  );
}

export interface CallApiPayload {
  readonly config: Config;
  // TODO: Rename
  readonly aggregatedApiCall: AggregatedApiCall;
}

interface VerificationFailure {
  log: PendingLog;
  response: ApiCallErrorResponse;
}

function verifySponsorWallet(payload: CallApiPayload): VerificationFailure | null {
  const { config, aggregatedApiCall } = payload;
  if (aggregatedApiCall.type === 'testing-gateway') return null;

  const { sponsorAddress, sponsorWalletAddress, id } = aggregatedApiCall;
  const hdNode = getMasterHDNode(config);
  if (isValidSponsorWallet(hdNode, sponsorAddress, sponsorWalletAddress)) return null;

  const message = `${RequestErrorMessage.SponsorWalletInvalid}, Request ID:${id}`;
  const log = logger.pend('ERROR', message);
  return {
    log,
    response: {
      success: false,
      errorMessage: message,
    },
  };
}

// TODO: Remove this check. It should be the responsibility of validator
function verifyReservedParameters(payload: CallApiPayload): VerificationFailure | null {
  const { config, aggregatedApiCall } = payload;
  const { endpointName, oisTitle, parameters } = aggregatedApiCall;
  const ois = config.ois.find((o) => o.title === oisTitle)!;
  const endpoint = ois.endpoints.find((e) => e.name === endpointName)!;
  const reservedParameters = getReservedParameters(endpoint, parameters);

  if (!reservedParameters._type) {
    // TODO: Why don't we use the same error message as in the return statement below?
    const log = logger.pend('ERROR', `No '_type' parameter was found for Endpoint:${endpoint.name}, OIS:${oisTitle}`);
    return {
      log,
      response: {
        success: false,
        errorMessage: `${RequestErrorMessage.ReservedParametersInvalid}: _type is missing for endpoint ${endpoint.name}`,
      },
    };
  }

  return null;
}

function verifyPayload(payload: CallApiPayload) {
  let verificationResult: VerificationFailure | null = null;

  verificationResult = verifySponsorWallet(payload);
  if (verificationResult) return verificationResult;

  verificationResult = verifyReservedParameters(payload);
  if (verificationResult) return verificationResult;
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
  const retryableCall = retryOnTimeout(API_CALL_TOTAL_TIMEOUT, () =>
    adapter.buildAndExecuteRequest(options, adapterConfig)
  );

  const [err, res] = await go(() => retryableCall);
  if (err) {
    const { aggregatedApiCall } = payload;
    const log = logger.pend('ERROR', `Failed to call Endpoint:${aggregatedApiCall.endpointName}`, err);
    return [[log], { success: false, errorMessage: `${RequestErrorMessage.ApiCallFailed} with error: ${err.message}` }];
  }

  return [[], { ...res! }];
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

  try {
    const response = adapter.extractAndEncodeResponse(
      rawResponse.data,
      reservedParameters as adapter.ReservedParameters
    );

    if (aggregatedApiCall.type === 'testing-gateway') {
      // NOTE: Testing gateway will use only the value and ignore the signature so there is no need
      // to compute it, since it is performance heavy operation.
      return [[], { success: true, value: JSON.stringify(response), signature: 'not-yet-supported' }];
    }

    const signature = await signResponseMessage(aggregatedApiCall.id, response.encodedValue, config);
    return [[], { success: true, value: response.encodedValue, signature }];
  } catch (e) {
    const data = JSON.stringify(rawResponse.data);
    const log = logger.pend('ERROR', `Unable to find response value from ${data}. Path: ${reservedParameters._path}`);
    return [[log], { success: false, errorMessage: RequestErrorMessage.ResponseValueNotFound }];
  }
}

export async function callApi(payload: CallApiPayload): Promise<LogsData<ApiCallResponse>> {
  const verificationResult = verifyPayload(payload);
  if (verificationResult) return [[verificationResult.log], verificationResult.response];

  const [logs, response] = await performApiCall(payload);
  if (isPerformApiCallFailure(response)) {
    return [logs, response];
  }

  return processSuccessfulApiCall(payload, response);
}
