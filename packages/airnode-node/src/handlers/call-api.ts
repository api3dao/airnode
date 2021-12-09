import * as adapter from '@api3/airnode-adapter';
import { OIS, RESERVED_PARAMETERS } from '@api3/airnode-ois';
import { ethers } from 'ethers';
import { getMasterHDNode } from '../evm';
import { getReservedParameters } from '../adapters/http/parameters';
import { API_CALL_TIMEOUT, API_CALL_TOTAL_TIMEOUT } from '../constants';
import { isValidSponsorWallet } from '../evm/verification';
import * as logger from '../logger';
import { AggregatedApiCall, ApiCallResponse, ChainConfig, Config, LogsData, RequestErrorMessage } from '../types';
import { removeKeys, removeKey } from '../utils/object-utils';
import { go, retryOnTimeout } from '../utils/promise-utils';

function buildOptions(
  chain: ChainConfig,
  ois: OIS,
  aggregatedApiCall: AggregatedApiCall,
  apiCredentials: adapter.ApiCredentials[],
  apiCallOptions: ApiCallOptions | undefined
): adapter.BuildRequestOptions {
  // Don't submit the reserved parameters to the API
  const sanitizedParameters: adapter.Parameters = removeKeys(aggregatedApiCall.parameters || {}, RESERVED_PARAMETERS);

  return {
    endpointName: aggregatedApiCall.endpointName!,
    parameters: sanitizedParameters,
    ois,
    apiCredentials,
    metadata: apiCallOptions?.forTestingGateway
      ? null
      : {
          airnodeAddress: aggregatedApiCall.airnodeAddress,
          requesterAddress: aggregatedApiCall.requesterAddress,
          sponsorAddress: aggregatedApiCall.sponsorAddress,
          sponsorWalletAddress: aggregatedApiCall.sponsorWalletAddress,
          endpointId: aggregatedApiCall.endpointId,
          requestId: aggregatedApiCall.id,
          chainId: aggregatedApiCall.chainId,
          chainType: chain.type,
          airnodeRrpAddress: chain.contracts.AirnodeRrp,
        },
  };
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

export interface ApiCallOptions {
  readonly forTestingGateway?: boolean;
}

export interface CallApiPayload {
  readonly config: Config;
  readonly aggregatedApiCall: AggregatedApiCall;
  readonly apiCallOptions: ApiCallOptions;
}

export async function callApi(payload: CallApiPayload): Promise<LogsData<ApiCallResponse>> {
  const { config, aggregatedApiCall, apiCallOptions } = payload;
  const { sponsorAddress, sponsorWalletAddress, chainId, endpointName, oisTitle, id, parameters } = aggregatedApiCall;

  const hdNode = getMasterHDNode(config);
  if (!isValidSponsorWallet(hdNode, sponsorAddress, sponsorWalletAddress)) {
    const message = `${RequestErrorMessage.SponsorWalletInvalid}, Request ID:${id}`;
    const log = logger.pend('ERROR', message);
    return [
      [log],
      {
        errorMessage: message,
      },
    ];
  }

  const chain = config.chains.find((c) => c.id === chainId)!;
  const ois = config.ois.find((o) => o.title === oisTitle)!;
  const endpoint = ois.endpoints.find((e) => e.name === endpointName)!;
  const apiCredentials = config.apiCredentials
    .filter((c) => c.oisTitle === oisTitle)
    .map((c) => removeKey(c, 'oisTitle'));

  // Check before making the API call in case the parameters are missing
  const reservedParameters = getReservedParameters(endpoint, parameters || {});
  if (!reservedParameters._type) {
    // TODO: Why don't we use the same error message as in the return statement below? (Using RequestErrorMessage)
    const log = logger.pend('ERROR', `No '_type' parameter was found for Endpoint:${endpoint.name}, OIS:${oisTitle}`);
    return [
      [log],
      {
        errorMessage: `${RequestErrorMessage.ReservedParametersInvalid}: _type is missing for endpoint ${endpoint.name}`,
      },
    ];
  }

  const options: adapter.BuildRequestOptions = buildOptions(
    chain,
    ois,
    aggregatedApiCall,
    apiCredentials as adapter.ApiCredentials[],
    apiCallOptions
  );

  // Each API call is allowed API_CALL_TIMEOUT ms to complete, before it is retried until the
  // maximum timeout is reached.
  const adapterConfig: adapter.Config = { timeout: API_CALL_TIMEOUT };
  // If the request times out, we attempt to call the API again. Any other errors will not result in retries
  const retryableCall = retryOnTimeout(API_CALL_TOTAL_TIMEOUT, () =>
    adapter.buildAndExecuteRequest(options, adapterConfig)
  );

  const [err, res] = await go(() => retryableCall);
  if (err) {
    const log = logger.pend('ERROR', `Failed to call Endpoint:${aggregatedApiCall.endpointName}`, err);
    return [[log], { errorMessage: `${RequestErrorMessage.ApiCallFailed} with error: ${err.message}` }];
  }

  try {
    const response = adapter.extractAndEncodeResponse(res?.data, reservedParameters as adapter.ReservedParameters);

    if (apiCallOptions?.forTestingGateway) {
      return [[], { value: JSON.stringify(response) }];
    }

    const value = response.encodedValue;
    const signature = await signResponseMessage(aggregatedApiCall.id, value, config);
    return [[], { value, signature }];
  } catch (e) {
    const data = JSON.stringify(res?.data || {});
    const log = logger.pend('ERROR', `Unable to find response value from ${data}. Path: ${reservedParameters._path}`);
    return [[log], { errorMessage: RequestErrorMessage.ResponseValueNotFound }];
  }
}
