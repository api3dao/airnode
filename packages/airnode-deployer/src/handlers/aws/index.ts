import * as path from 'path';
import { logger, randomHexString, setLogOptions, addMetadata, caching } from '@api3/airnode-utilities';
import { go } from '@api3/promise-utils';
import {
  handlers,
  providers,
  WorkerPayload,
  InitializeProviderPayload,
  ProcessTransactionsPayload,
  CallApiPayload,
  loadTrustedConfig,
  EnabledGateway,
  verifyHttpRequest,
  verifyHttpSignedDataRequest,
  verifyRequestOrigin,
  ProcessSignOevDataRequestBody,
  verifySignOevDataRequest,
} from '@api3/airnode-node';

caching.init();

const configFile = path.resolve(`${__dirname}/../../config-data/config.json`);
const parsedConfig = loadTrustedConfig(configFile, process.env);

export async function startCoordinator() {
  const coordinatorId = randomHexString(16);
  setLogOptions({
    format: parsedConfig.nodeSettings.logFormat,
    level: parsedConfig.nodeSettings.logLevel,
    meta: { 'Coordinator-ID': coordinatorId },
  });
  await handlers.startCoordinator(parsedConfig, coordinatorId);
  const response = { ok: true, data: { message: 'Coordinator completed' } };
  caching.syncFsSync();
  return { statusCode: 200, body: JSON.stringify(response) };
}

export function run(payload: WorkerPayload): Promise<AWSLambda.APIGatewayProxyResult> {
  setLogOptions(payload.logOptions);

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
  const { state } = payload;
  const { chainId, name: providerName } = state.settings;
  addMetadata({ 'Chain-ID': chainId, Provider: providerName });
  const stateWithConfig = { ...state, config: parsedConfig };

  const goInitializedState = await go(() => handlers.initializeProvider(stateWithConfig));
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
  const { aggregatedApiCall } = payload;
  const { chainId, endpointId } = aggregatedApiCall;
  addMetadata({ 'Chain-ID': chainId, 'Endpoint-ID': endpointId });

  const [logs, apiCallResponse] = await handlers.callApi(parsedConfig, aggregatedApiCall);
  logger.logPending(logs);

  const response = JSON.stringify({ ok: true, data: apiCallResponse });
  return { statusCode: 200, body: response };
}

async function processTransactions(payload: ProcessTransactionsPayload) {
  const { state } = payload;
  const { chainId, name: providerName } = state.settings;
  const stateWithConfig = { ...state, config: parsedConfig };
  addMetadata({ 'Chain-ID': chainId, Provider: providerName, 'Sponsor-Address': state.sponsorAddress });

  const goUpdatedState = await go(() => handlers.processTransactions(stateWithConfig));
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
  setLogOptions({
    format: parsedConfig.nodeSettings.logFormat,
    level: parsedConfig.nodeSettings.logLevel,
  });

  logger.debug(`HTTP gateway request received`);

  // Check if the request origin header is allowed in the config
  const originVerification = verifyRequestOrigin(
    (parsedConfig.nodeSettings.httpGateway as EnabledGateway).corsOrigins,
    event.headers.origin
  );
  // Respond to preflight requests
  if (event.httpMethod === 'OPTIONS') {
    if (!originVerification.success) {
      logger.error(`HTTP gateway request origin verification error`);
      return { statusCode: 400, body: JSON.stringify(originVerification.error) };
    }

    return { statusCode: 204, headers: originVerification.headers, body: '' };
  }
  logger.debug(`HTTP gateway request passed origin verification`);

  // The shape of the body is guaranteed by the openAPI spec
  const rawParameters = (JSON.parse(event.body!) as ProcessHttpRequestBody).parameters;
  // The "endpointId" path parameter existence is guaranteed by the openAPI spec
  const rawEndpointId = event.pathParameters!.endpointId!;

  const verificationResult = verifyHttpRequest(parsedConfig, rawParameters, rawEndpointId);
  if (!verificationResult.success) {
    const { statusCode, error } = verificationResult;
    logger.error(`HTTP gateway request verification error`);
    return { statusCode, headers: originVerification.headers, body: JSON.stringify(error) };
  }
  const { parameters, endpointId } = verificationResult;

  addMetadata({ 'Endpoint-ID': endpointId });
  logger.debug(`HTTP gateway request passed request verification`);
  const [err, result] = await handlers.processHttpRequest(parsedConfig, endpointId, parameters);
  if (err) {
    // Returning 500 because failure here means something went wrong internally with a valid request
    logger.error(`HTTP gateway request processing error`);
    return { statusCode: 500, headers: originVerification.headers, body: JSON.stringify({ message: err.toString() }) };
  }
  logger.debug(`HTTP gateway request processed successfully`);

  // We do not want the user to see {"success": true, "data": <actual_data>}, but the actual data itself
  return { statusCode: 200, headers: originVerification.headers, body: JSON.stringify(result!.data) };
}

interface ProcessHttpSignedDataRequestBody {
  encodedParameters: string;
}

// TODO: Copy&paste for now, will refactor as part of
// https://api3dao.atlassian.net/browse/AN-527
export async function processHttpSignedDataRequest(
  event: AWSLambda.APIGatewayProxyEvent
): Promise<AWSLambda.APIGatewayProxyResult> {
  setLogOptions({
    format: parsedConfig.nodeSettings.logFormat,
    level: parsedConfig.nodeSettings.logLevel,
  });

  logger.debug(`HTTP signed data gateway request received`);

  // Check if the request origin header is allowed in the config
  const originVerification = verifyRequestOrigin(
    (parsedConfig.nodeSettings.httpSignedDataGateway as EnabledGateway).corsOrigins,
    event.headers.origin
  );
  // Respond to preflight requests
  if (event.httpMethod === 'OPTIONS') {
    if (!originVerification.success) {
      logger.error(`HTTP signed data gateway request origin verification error`);
      return { statusCode: 400, body: JSON.stringify(originVerification.error) };
    }

    return { statusCode: 204, headers: originVerification.headers, body: '' };
  }
  logger.debug(`HTTP signed data gateway request passed origin verification`);

  // The shape of the body is guaranteed by the openAPI spec
  const rawEncodedParameters = (JSON.parse(event.body!) as ProcessHttpSignedDataRequestBody).encodedParameters;
  // The "endpointId" path parameter existence is guaranteed by the openAPI spec
  const rawEndpointId = event.pathParameters!.endpointId!;

  const verificationResult = verifyHttpSignedDataRequest(parsedConfig, rawEncodedParameters, rawEndpointId);
  if (!verificationResult.success) {
    logger.error(`HTTP signed data gateway request verification error`);
    const { statusCode, error } = verificationResult;
    return { statusCode, headers: originVerification.headers, body: JSON.stringify(error) };
  }
  const { encodedParameters, endpointId } = verificationResult;

  addMetadata({ 'Endpoint-ID': endpointId });
  logger.debug(`HTTP signed data gateway request passed request verification`);
  const [err, result] = await handlers.processHttpSignedDataRequest(parsedConfig, endpointId, encodedParameters);
  if (err) {
    // Returning 500 because failure here means something went wrong internally with a valid request
    logger.error(`HTTP signed data gateway request processing error`);
    return { statusCode: 500, headers: originVerification.headers, body: JSON.stringify({ message: err.toString() }) };
  }
  logger.debug(`HTTP signed data gateway request processed successfully`);

  // We do not want the user to see {"success": true, "data": <actual_data>}, but the actual data itself
  return { statusCode: 200, headers: originVerification.headers, body: JSON.stringify(result!.data) };
}

export async function processSignOevDataRequest(
  event: AWSLambda.APIGatewayProxyEvent
): Promise<AWSLambda.APIGatewayProxyResult> {
  setLogOptions({
    format: parsedConfig.nodeSettings.logFormat,
    level: parsedConfig.nodeSettings.logLevel,
  });

  logger.debug(`Sign OEV data request received`);

  // Check if the request origin header is allowed in the config
  const originVerification = verifyRequestOrigin(
    (parsedConfig.nodeSettings.oevGateway as EnabledGateway).corsOrigins,
    event.headers.origin
  );
  // Respond to preflight requests
  if (event.httpMethod === 'OPTIONS') {
    if (!originVerification.success) {
      logger.error(`Sign OEV data request origin verification error`);
      return { statusCode: 400, body: JSON.stringify(originVerification.error) };
    }

    return { statusCode: 204, headers: originVerification.headers, body: '' };
  }
  logger.debug(`Sign OEV data request passed origin verification`);

  // The shape of the body is guaranteed by the openAPI spec
  const rawSignOevDataRequestBody = JSON.parse(event.body!) as ProcessSignOevDataRequestBody;

  const verificationResult = verifySignOevDataRequest(rawSignOevDataRequestBody);
  if (!verificationResult.success) {
    logger.error(`Sign OEV data request verification error`);
    const { statusCode, error } = verificationResult;
    return { statusCode, headers: originVerification.headers, body: JSON.stringify(error) };
  }
  logger.debug(`Sign OEV data request passed request verification`);
  const { beacons, oevUpdateHash } = verificationResult;

  const [err, result] = await handlers.signOevData(beacons, oevUpdateHash);
  if (err) {
    // Returning 500 because failure here means something went wrong internally with a valid request
    logger.error(`Sign OEV data request processing error`);
    return { statusCode: 500, headers: originVerification.headers, body: JSON.stringify({ message: err.toString() }) };
  }
  logger.debug(`Sign OEV data request processed successfully`);

  // We do not want the user to see {"success": true, "data": <actual_data>}, but the actual data itself
  return { statusCode: 200, headers: originVerification.headers, body: JSON.stringify(result!.data) };
}
