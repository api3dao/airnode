import { logger } from '@api3/airnode-utilities';
import { goSync } from '@api3/promise-utils';
import AWS from 'aws-sdk';
import { WorkerParameters, WorkerResponse } from '../../types';

export function spawn(params: WorkerParameters): Promise<WorkerResponse> {
  // lambda.invoke is synchronous so we need to wrap this in a promise
  return new Promise((spawnResolve, spawnReject) => {
    // Uses the current region by default
    const lambda = new AWS.Lambda();

    // AWS doesn't allow uppercase letters in lambda function names
    const resolvedName = `airnode-${params.airnodeAddressShort}-${params.stage}-run`;

    const options = {
      FunctionName: resolvedName,
      Payload: JSON.stringify(params.payload),
    };

    const resolve: typeof spawnResolve = (value) => {
      logger.debug(`Successful Lambda response: ${value}`);
      spawnResolve(value);
    };

    const reject: typeof spawnReject = (error) => {
      logger.debug(`Lambda invocation or execution failed. Response: ${error}`);
      spawnReject(error);
    };

    // The Lambda invocation callback populates the error (first argument) only when the invocation fails (e.g. status
    // code is 400) or the request is not parsed properly by the SDK and can't be invoked. For errors and timeouts that
    // happen inside the invoked lambda have "data.FunctionError" and "data.Payload.errorMessage" populated instead.
    // See: https://stackoverflow.com/q/42672023 and https://stackoverflow.com/q/48644093
    lambda.invoke(options, (err, data) => {
      if (err) return reject(err);

      if (data.FunctionError) return reject(data.Payload);

      if (!data.Payload) return reject(new Error('Missing payload in lambda response'));
      const goPayload = goSync(() => JSON.parse(data.Payload!.toString()));
      if (!goPayload.success) return reject(goPayload.error);

      const goBody = goSync(() => JSON.parse(goPayload.data.body));
      if (!goBody.success) return reject(goBody.error);

      resolve(goBody.data as WorkerResponse);
    });
  });
}
