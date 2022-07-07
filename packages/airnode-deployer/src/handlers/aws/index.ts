import * as path from 'path';
import { logger, DEFAULT_RETRY_DELAY_MS } from '@api3/airnode-utilities';
import { go } from '@api3/promise-utils';
import {
  handlers,
  providers,
  WorkerPayload,
  InitializeProviderPayload,
  ProcessTransactionsPayload,
  CallApiPayload,
  loadTrustedConfig,
  ApiCallPayload,
} from '@api3/airnode-node';
import { verifyHttpSignedDataRequest, verifyHttpRequest } from '../common';

const configFile = path.resolve(`${__dirname}/../../config-data/config.json`);
const parsedConfig = loadTrustedConfig(configFile, process.env);

export async function startCoordinator() {
  await handlers.startCoordinator(parsedConfig);
  const response = { ok: true, data: { message: 'Coordinator completed' } };
  return { statusCode: 200, body: JSON.stringify(response) };
}

export async function run(payload: WorkerPayload): Promise<AWSLambda.APIGatewayProxyResult> {
  switch (payload.functionName) {
    case 'initializeProvider':
      return initializeProvider(payload);
    case 'callApi':
      return callApi(payload);
    case 'processTransactions':
      return processTransactions(payload);
  }
}

// TODO: Refactor handlers so they are common for all the cloud providers
// https://api3dao.atlassian.net/browse/AN-527

async function initializeProvider(payload: InitializeProviderPayload) {
  const stateWithConfig = { ...payload.state, config: parsedConfig };

  const goInitializedState = await go(() => handlers.initializeProvider(stateWithConfig), {
    delay: { type: 'static', delayMs: DEFAULT_RETRY_DELAY_MS },
  });
  if (!goInitializedState.success) {
    const msg = `Failed to initialize provider: ${stateWithConfig.settings.name}`;
    logger.error(goInitializedState.error.toString());
    const errorLog = logger.pend('ERROR', msg, goInitializedState.error);
    const body = JSON.stringify({ ok: false, errorLog });
    return { statusCode: 500, body };
  }
  if (!goInitializedState.data) {
    const msg = `Failed to initialize provider: ${stateWithConfig.settings.name}`;
    const errorLog = logger.pend('ERROR', msg);
    const body = JSON.stringify({ ok: false, errorLog });
    return { statusCode: 500, body };
  }

  const body = JSON.stringify({ ok: true, data: providers.scrub(goInitializedState.data) });
  return { statusCode: 200, body };
}

async function callApi(payload: CallApiPayload) {
  const { aggregatedApiCall, logOptions } = payload;
  const [logs, apiCallResponse] = await handlers.callApi({
    type: 'regular',
    config: parsedConfig,
    aggregatedApiCall,
  } as ApiCallPayload);
  logger.logPending(logs, logOptions);
  const response = JSON.stringify({ ok: true, data: apiCallResponse });
  return { statusCode: 200, body: response };
}

async function processTransactions(payload: ProcessTransactionsPayload) {
  const stateWithConfig = { ...payload.state, config: parsedConfig };

  const goUpdatedState = await go(() => handlers.processTransactions(stateWithConfig), {
    delay: { type: 'static', delayMs: DEFAULT_RETRY_DELAY_MS },
  });
  if (!goUpdatedState.success) {
    const msg = `Failed to process provider requests: ${stateWithConfig.settings.name}`;
    logger.error(goUpdatedState.error.toString());
    const errorLog = logger.pend('ERROR', msg, goUpdatedState.error);
    const body = JSON.stringify({ ok: false, errorLog });
    return { statusCode: 500, body };
  }

  const body = JSON.stringify({ ok: true, data: providers.scrub(goUpdatedState.data) });
  return { statusCode: 200, body };
}

interface ProcessHttpRequestBody {
  parameters: object;
}

export async function processHttpRequest(
  event: AWSLambda.APIGatewayProxyEvent
): Promise<AWSLambda.APIGatewayProxyResult> {
  // The shape of the body is guaranteed by the openAPI spec
  const rawParameters = (JSON.parse(event.body!) as ProcessHttpRequestBody).parameters;
  // The "endpointId" path parameter existence is guaranteed by the openAPI spec
  const rawEndpointId = event.pathParameters!.endpointId!;

  const verificationResult = verifyHttpRequest(parsedConfig, rawParameters, rawEndpointId);
  if (!verificationResult.success) {
    const { statusCode, error } = verificationResult;
    return { statusCode, body: JSON.stringify(error) };
  }
  const { parameters, endpointId } = verificationResult;

  const [err, result] = await handlers.processHttpRequest(parsedConfig, endpointId, parameters);
  if (err) {
    // Returning 500 because failure here means something went wrong internally with a valid request
    return { statusCode: 500, body: JSON.stringify({ message: err.toString() }) };
  }

  // We do not want the user to see {"success": true, "data": <actual_data>}, but the actual data itself
  return { statusCode: 200, body: JSON.stringify(result!.data) };
}

interface ProcessHttpSignedDataRequestBody {
  encodedParameters: string;
}

// TODO: Copy&paste for now, will refactor as part of
// https://api3dao.atlassian.net/browse/AN-527
export async function processHttpSignedDataRequest(
  event: AWSLambda.APIGatewayProxyEvent
): Promise<AWSLambda.APIGatewayProxyResult> {
  // The shape of the body is guaranteed by the openAPI spec
  const rawEncodedParameters = (JSON.parse(event.body!) as ProcessHttpSignedDataRequestBody).encodedParameters;
  // The "endpointId" path parameter existence is guaranteed by the openAPI spec
  const rawEndpointId = event.pathParameters!.endpointId!;

  const verificationResult = verifyHttpSignedDataRequest(parsedConfig, rawEncodedParameters, rawEndpointId);
  if (!verificationResult.success) {
    const { statusCode, error } = verificationResult;
    return { statusCode, body: JSON.stringify(error) };
  }
  const { encodedParameters, endpointId } = verificationResult;

  const [err, result] = await handlers.processHttpSignedDataRequest(parsedConfig, endpointId, encodedParameters);
  if (err) {
    // Returning 500 because failure here means something went wrong internally with a valid request
    return { statusCode: 500, body: JSON.stringify({ message: err.toString() }) };
  }

  // We do not want the user to see {"success": true, "data": <actual_data>}, but the actual data itself
  return { statusCode: 200, body: JSON.stringify(result!.data) };
}
