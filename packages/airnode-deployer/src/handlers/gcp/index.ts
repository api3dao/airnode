import * as path from 'path';
import { Request, Response } from '@google-cloud/functions-framework/build/src/functions';
import { config, handlers, logger, utils, providers } from '@api3/airnode-node';

const configFile = path.resolve(`${__dirname}/../../config-data/config.json`);
const parsedConfig = config.parseConfig(configFile, process.env);

export async function startCoordinator(_req: Request, res: Response) {
  await handlers.startCoordinator(parsedConfig);
  const response = { ok: true, data: { message: 'Coordinator completed' } };
  res.status(200).send(response);
}

export async function initializeProvider(req: Request, res: Response) {
  const stateWithConfig = { ...req.body.state, config: parsedConfig };

  const [err, initializedState] = await utils.go(() => handlers.initializeProvider(stateWithConfig));
  if (err || !initializedState) {
    const msg = `Failed to initialize provider: ${stateWithConfig.settings.name}`;
    console.log(err!.toString());
    const errorLog = logger.pend('ERROR', msg, err);
    const body = { ok: false, errorLog };
    res.status(500).send(body);
    return;
  }

  const body = { ok: true, data: providers.scrub(initializedState) };
  res.status(200).send(body);
}

export async function callApi(req: Request, res: Response) {
  const { aggregatedApiCall, logOptions, apiCallOptions } = req.body;
  const [logs, apiCallResponse] = await handlers.callApi({ config: parsedConfig, apiCallOptions, aggregatedApiCall });
  logger.logPending(logs, logOptions);
  const response = { ok: true, data: apiCallResponse };
  res.status(200).send(response);
}

export async function processProviderRequests(req: Request, res: Response) {
  const stateWithConfig = { ...req.body.state, config: parsedConfig };

  const [err, updatedState] = await utils.go(() => handlers.processTransactions(stateWithConfig));
  if (err || !updatedState) {
    const msg = `Failed to process provider requests: ${stateWithConfig.settings.name}`;
    const errorLog = logger.pend('ERROR', msg, err);
    const body = { ok: false, errorLog };
    res.status(500).send(body);
    return;
  }

  const body = { ok: true, data: providers.scrub(updatedState) };
  res.status(200).send(body);
}
