import AWS from 'aws-sdk';
import { WorkerParameters, WorkerResponse } from '../../types';

export function spawn(params: WorkerParameters): Promise<WorkerResponse> {
  // lambda.invoke is synchronous so we need to wrap this in a promise
  return new Promise((resolve, reject) => {
    // Uses the current region by default
    const lambda = new AWS.Lambda();

    // AWS doesn't allow uppercase letters in lambda function names
    const resolvedName = `airnode-${params.airnodeAddressShort}-${params.stage}-run`;

    const options = {
      FunctionName: resolvedName,
      Payload: JSON.stringify(params.payload),
    };

    lambda.invoke(options, (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(JSON.parse(JSON.parse(data.Payload as string).body) as WorkerResponse);
    });
  });
}
