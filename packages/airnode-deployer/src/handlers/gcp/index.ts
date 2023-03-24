import * as path from 'path';
import { Request, Response } from '@google-cloud/functions-framework/build/src/functions';
import {
  handlers,
  providers,
  InitializeProviderPayload,
  CallApiPayload,
  ProcessTransactionsPayload,
  WorkerPayload,
  loadTrustedConfig,
  EnabledGateway,
  verifyHttpSignedDataRequest,
  verifyHttpRequest,
  verifyRequestOrigin,
  signOevDataBodySchema,
  verifySignOevDataRequest,
} from '@api3/airnode-node';
import { logger, randomHexString, setLogOptions, addMetadata, caching } from '@api3/airnode-utilities';
import { go } from '@api3/promise-utils';
import { z } from 'zod';

caching.init();

const configFile = path.resolve(`${__dirname}/../../config-data/config.json`);
const parsedConfig = loadTrustedConfig(configFile, process.env);

export async function startCoordinator(_req: Request, res: Response) {
  const coordinatorId = randomHexString(16);
  setLogOptions({
    format: parsedConfig.nodeSettings.logFormat,
    level: parsedConfig.nodeSettings.logLevel,
    meta: { 'Coordinator-ID': coordinatorId },
  });
  await handlers.startCoordinator(parsedConfig, coordinatorId);
  const response = { ok: true, data: { message: 'Coordinator completed' } };
  res.status(200).send(response);
}

export function run(req: Request, res: Response) {
  const payload: WorkerPayload = req.body;
  setLogOptions(payload.logOptions);

  switch (payload.functionName) {
    case 'initializeProvider':
      return initializeProvider(payload, res);
    case 'callApi':
      return callApi(payload, res);
    case 'processTransactions':
      return processTransactions(payload, res);
  }
}

// TODO: Refactor handlers so they are common for all the cloud providers
// https://api3dao.atlassian.net/browse/AN-527

async function initializeProvider(payload: InitializeProviderPayload, res: Response) {
  const { state } = payload;
  const { chainId, name: providerName } = state.settings;
  addMetadata({ 'Chain-ID': chainId, Provider: providerName });
  const stateWithConfig = { ...state, config: parsedConfig };

  const goInitializedState = await go(() => handlers.initializeProvider(stateWithConfig));
  if (!goInitializedState.success) {
    const msg = `Failed to initialize provider: ${stateWithConfig.settings.name}`;
    logger.log(goInitializedState.error.toString());
    const errorLog = logger.pend('ERROR', msg, goInitializedState.error);
    const body = { ok: false, errorLog };
    res.status(500).send(body);
    return;
  }
  if (!goInitializedState.data) {
    const msg = `Failed to initialize provider: ${stateWithConfig.settings.name}`;
    const errorLog = logger.pend('ERROR', msg);
    const body = { ok: false, errorLog };
    res.status(500).send(body);
    return;
  }

  const body = { ok: true, data: providers.scrub(goInitializedState.data) };
  res.status(200).send(body);
}

async function callApi(payload: CallApiPayload, res: Response) {
  const { aggregatedApiCall } = payload;
  const { chainId, endpointId } = aggregatedApiCall;
  addMetadata({ 'Chain-ID': chainId, 'Endpoint-ID': endpointId });

  const [logs, apiCallResponse] = await handlers.callApi(parsedConfig, aggregatedApiCall);
  logger.logPending(logs);

  const response = { ok: true, data: apiCallResponse };
  res.status(200).send(response);
}

async function processTransactions(payload: ProcessTransactionsPayload, res: Response) {
  const { state } = payload;
  const { chainId, name: providerName } = state.settings;
  const stateWithConfig = { ...state, config: parsedConfig };
  addMetadata({ 'Chain-ID': chainId, Provider: providerName, 'Sponsor-Address': state.sponsorAddress });

  const goUpdatedState = await go(() => handlers.processTransactions(stateWithConfig));
  if (!goUpdatedState.success) {
    const msg = `Failed to process provider requests: ${stateWithConfig.settings.name}`;
    const errorLog = logger.pend('ERROR', msg, goUpdatedState.error);
    const body = { ok: false, errorLog };
    res.status(500).send(body);
    return;
  }

  const body = { ok: true, data: providers.scrub(goUpdatedState.data) };
  res.status(200).send(body);
}

// We do not want to enable ".strict()" - we want to allow extra fields in the request body
const httpRequestBodySchema = z.object({
  parameters: z.any(), // Parameter validation is performed later
});

export async function processHttpRequest(req: Request, res: Response) {
  setLogOptions({
    format: parsedConfig.nodeSettings.logFormat,
    level: parsedConfig.nodeSettings.logLevel,
  });

  logger.debug(`HTTP gateway request received`);

  // Check if the request origin header is allowed in the config
  const originVerification = verifyRequestOrigin(
    (parsedConfig.nodeSettings.httpGateway as EnabledGateway).corsOrigins,
    req.headers.origin
  );
  // Respond to preflight requests
  if (req.method === 'OPTIONS') {
    if (!originVerification.success) {
      logger.error(`HTTP gateway request origin verification error`);
      res.status(400).send(originVerification.error);
      return;
    }

    res.set(originVerification.headers).status(204).send('');
    return;
  }
  // Set headers for the responses
  res.set(originVerification.headers);
  logger.debug(`HTTP gateway request passed origin verification`);

  const parsedBody = httpRequestBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    // This error and status code is returned by AWS gateway when the request does not match the openAPI
    // specification. We want the same error to be returned by the GCP gateway.
    logger.error(`HTTP gateway request invalid request body`);
    res.status(400).send({ message: 'Invalid request body' });
    return;
  }
  const { parameters: rawParameters } = parsedBody.data;

  // Guaranteed to exist by the openAPI schema
  const { endpointId: rawEndpointId } = req.query;
  logger.debug(`HTTP gateway request passed request body parsing`);

  const verificationResult = verifyHttpRequest(parsedConfig, rawParameters, rawEndpointId as string);
  if (!verificationResult.success) {
    const { statusCode, error } = verificationResult;
    logger.error(`HTTP gateway request verification error`);
    res.status(statusCode).send(error);
    return;
  }
  const { parameters, endpointId } = verificationResult;

  addMetadata({ 'Endpoint-ID': endpointId });
  logger.debug(`HTTP gateway request passed request verification`);
  const [err, result] = await handlers.processHttpRequest(parsedConfig, endpointId, parameters);
  if (err) {
    // Returning 500 because failure here means something went wrong internally with a valid request
    logger.error(`HTTP gateway request processing error`);
    res.status(500).send({ message: err.toString() });
    return;
  }
  logger.debug(`HTTP gateway request processed successfully`);

  // We do not want the user to see {"success": true, "data": <actual_data>}, but the actual data itself
  res.status(200).send(result!.data);
}

// We do not want to enable ".strict()" - we want to allow extra fields in the request body
const httpSignedDataBodySchema = z.object({
  encodedParameters: z.string(),
});

// TODO: Copy&paste for now, will refactor as part of
// https://api3dao.atlassian.net/browse/AN-527
export async function processHttpSignedDataRequest(req: Request, res: Response) {
  setLogOptions({
    format: parsedConfig.nodeSettings.logFormat,
    level: parsedConfig.nodeSettings.logLevel,
  });

  logger.debug(`HTTP signed data gateway request received`);

  // Check if the request origin header is allowed in the config
  const originVerification = verifyRequestOrigin(
    (parsedConfig.nodeSettings.httpSignedDataGateway as EnabledGateway).corsOrigins,
    req.headers.origin
  );
  // Respond to preflight requests
  if (req.method === 'OPTIONS') {
    if (!originVerification.success) {
      logger.error(`HTTP signed data gateway request origin verification error`);
      res.status(400).send(originVerification.error);
      return;
    }

    res.set(originVerification.headers).status(204).send('');
    return;
  }
  // Set headers for the responses
  res.set(originVerification.headers);
  logger.debug(`HTTP signed data gateway request passed origin verification`);

  const parsedBody = httpSignedDataBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    // This error and status code is returned by AWS gateway when the request does not match the openAPI
    // specification. We want the same error to be returned by the GCP gateway.
    logger.error(`HTTP signed data gateway request invalid request body`);
    res.status(400).send({ message: 'Invalid request body' });
    return;
  }
  const { encodedParameters: rawEncodedParameters } = parsedBody.data;

  // Guaranteed to exist by the openAPI schema
  const { endpointId: rawEndpointId } = req.query;
  logger.debug(`HTTP signed data gateway request passed request body parsing`);

  const verificationResult = verifyHttpSignedDataRequest(parsedConfig, rawEncodedParameters, rawEndpointId as string);
  if (!verificationResult.success) {
    const { statusCode, error } = verificationResult;
    logger.error(`HTTP signed data gateway request verification error`);
    res.status(statusCode).send(error);
    return;
  }
  const { encodedParameters, endpointId } = verificationResult;

  addMetadata({ 'Endpoint-ID': endpointId });
  logger.debug(`HTTP signed data gateway request passed request verification`);
  const [err, result] = await handlers.processHttpSignedDataRequest(
    parsedConfig,
    endpointId as string,
    encodedParameters
  );
  if (err) {
    // Returning 500 because failure here means something went wrong internally with a valid request
    logger.error(`HTTP signed data gateway request processing error`);
    res.status(500).send({ message: err.toString() });
    return;
  }
  logger.debug(`HTTP signed data gateway request processed successfully`);

  // We do not want the user to see {"success": true, "data": <actual_data>}, but the actual data itself
  res.status(200).send(result!.data);
}

export async function processSignOevDataRequest(req: Request, res: Response) {
  setLogOptions({
    format: parsedConfig.nodeSettings.logFormat,
    level: parsedConfig.nodeSettings.logLevel,
  });

  logger.debug(`Sign OEV data request received`);

  // Check if the request origin header is allowed in the config
  const originVerification = verifyRequestOrigin(
    (parsedConfig.nodeSettings.oevGateway as EnabledGateway).corsOrigins,
    req.headers.origin
  );
  // Respond to preflight requests
  if (req.method === 'OPTIONS') {
    if (!originVerification.success) {
      logger.error(`Sign OEV data request origin verification error`);
      res.status(400).send(originVerification.error);
      return;
    }

    res.set(originVerification.headers).status(204).send('');
    return;
  }
  // Set headers for the responses
  res.set(originVerification.headers);
  logger.debug(`Sign OEV data request passed origin verification`);

  const parsedBody = signOevDataBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    // This error and status code is returned by AWS gateway when the request does not match the openAPI
    // specification. We want the same error to be returned by the GCP gateway.
    logger.error(`Sign OEV data request invalid request body`);
    res.status(400).send({ message: 'Invalid request body' });
    return;
  }
  const rawSignOevDataRequestBody = parsedBody.data;
  logger.debug(`HTTP signed data gateway request passed request body parsing`);

  const verificationResult = verifySignOevDataRequest(rawSignOevDataRequestBody);
  if (!verificationResult.success) {
    logger.error(`Sign OEV data request verification error`);
    const { statusCode, error } = verificationResult;
    res.status(statusCode).send(error);
    return;
  }
  logger.debug(`Sign OEV data request passed request verification`);
  const { beacons, oevUpdateHash } = verificationResult;

  const [err, result] = await handlers.signOevData(beacons, oevUpdateHash);
  if (err) {
    // Returning 500 because failure here means something went wrong internally with a valid request
    logger.error(`Sign OEV data request processing error`);
    res.status(500).send({ message: err.toString() });
  }
  logger.debug(`Sign OEV data request processed successfully`);

  // We do not want the user to see {"success": true, "data": <actual_data>}, but the actual data itself
  res.status(200).send(result!.data);
}
