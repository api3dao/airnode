import * as fs from 'fs';
import * as path from 'path';
import { config, handlers, logger, promiseUtils, providerState } from '@api3/node';
import * as node from '@api3/node';

const configFile = path.resolve(`${__dirname}/../../config-data/config.json`);
const rawConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
const parsedConfig = config.parseConfig(rawConfig[0]);

function encodeBody(data: node.WorkerResponse): string {
  return JSON.stringify(data);
}

export async function startCoordinator() {
  await handlers.startCoordinator(parsedConfig);
  const response = { ok: true, data: { message: 'Coordinator completed' } };
  return { statusCode: 200, body: encodeBody(response) };
}

export async function initializeProvider(event: any) {
  const stateWithConfig = { ...event.state, config: parsedConfig };

  const [err, initializedState] = await promiseUtils.go(() => handlers.initializeProvider(stateWithConfig));
  if (err || !initializedState) {
    const msg = `Failed to initialize provider: ${stateWithConfig.settings.name}`;
    const errorLog = logger.pend('ERROR', msg, err);
    const body = encodeBody({ ok: false, errorLog });
    return { statusCode: 500, body };
  }

  const body = encodeBody({ ok: true, data: providerState.scrub(initializedState) });
  return { statusCode: 200, body };
}

export async function callApi(event: any) {
  const { aggregatedApiCall, logOptions } = event;
  const [logs, apiCallResponse] = await handlers.callApi(parsedConfig, aggregatedApiCall);
  logger.logPending(logs, logOptions);
  const response = encodeBody({ ok: true, data: apiCallResponse });
  return { statusCode: 200, body: response };
}

export async function processProviderRequests(event: any) {
  const stateWithConfig = { ...event.state, config: parsedConfig };

  const [err, updatedState] = await promiseUtils.go(() => handlers.processTransactions(stateWithConfig));
  if (err || !updatedState) {
    const msg = `Failed to process provider requests: ${stateWithConfig.settings.name}`;
    const errorLog = logger.pend('ERROR', msg, err);
    const body = encodeBody({ ok: false, errorLog });
    return { statusCode: 500, body };
  }

  const body = encodeBody({ ok: true, data: providerState.scrub(updatedState) });
  return { statusCode: 200, body };
}
