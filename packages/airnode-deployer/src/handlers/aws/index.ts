import * as path from 'path';
import { handlers, logger, utils, providers, WorkerResponse } from '@api3/airnode-node';
import { loadConfig } from '../../utils';

const configFile = path.resolve(`${__dirname}/../../config-data/config.json`);
const parsedConfig = loadConfig(configFile, process.env);

function encodeBody(data: WorkerResponse): string {
  return JSON.stringify(data);
}

export async function startCoordinator() {
  await handlers.startCoordinator(parsedConfig);
  const response = { ok: true, data: { message: 'Coordinator completed' } };
  return { statusCode: 200, body: encodeBody(response) };
}

export async function initializeProvider(event: any) {
  const stateWithConfig = { ...event.state, config: parsedConfig };

  const [err, initializedState] = await utils.go(() => handlers.initializeProvider(stateWithConfig));
  if (err || !initializedState) {
    const msg = `Failed to initialize provider: ${stateWithConfig.settings.name}`;
    const errorLog = logger.pend('ERROR', msg, err);
    const body = encodeBody({ ok: false, errorLog });
    return { statusCode: 500, body };
  }

  const body = encodeBody({ ok: true, data: providers.scrub(initializedState) });
  return { statusCode: 200, body };
}

export async function callApi(event: any) {
  const { aggregatedApiCall, logOptions } = event;
  const [logs, apiCallResponse] = await handlers.callApi({ config: parsedConfig, aggregatedApiCall });
  logger.logPending(logs, logOptions);
  const response = encodeBody({ ok: true, data: apiCallResponse });
  return { statusCode: 200, body: response };
}

export async function processProviderRequests(event: any) {
  const stateWithConfig = { ...event.state, config: parsedConfig };

  const [err, updatedState] = await utils.go(() => handlers.processTransactions(stateWithConfig));
  if (err || !updatedState) {
    const msg = `Failed to process provider requests: ${stateWithConfig.settings.name}`;
    const errorLog = logger.pend('ERROR', msg, err);
    const body = encodeBody({ ok: false, errorLog });
    return { statusCode: 500, body };
  }

  const body = encodeBody({ ok: true, data: providers.scrub(updatedState) });
  return { statusCode: 200, body };
}

export async function testApi(event: any) {
  const parameters = JSON.parse(event.body).parameters;
  const endpointId = event.pathParameters.endpointId;

  const [err, result] = await handlers.testApi(parsedConfig, endpointId, parameters);
  if (err) {
    return { statusCode: 400, body: JSON.stringify({ error: err.toString() }) };
  }

  // NOTE: We do not want the user to see {"value": <actual_value>}, but the actual value itself
  return { statusCode: 200, body: result!.value };
}
