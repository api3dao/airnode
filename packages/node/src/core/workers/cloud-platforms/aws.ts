import AWS from 'aws-sdk';
import * as awsHandlers from '../../../aws/handler';
import { WorkerParameters } from '../../../types';

export function spawn(params: WorkerParameters) {
  // lambda.invoke is synchronous so we need to wrap this in a promise
  return new Promise((resolve, reject) => {
    // Uses the current region by default
    const lambda = new AWS.Lambda();

    const resolvedName = `airnode-${params.stage}-${params.providerIdShort}-${params.functionName}`;

    const options = {
      FunctionName: resolvedName,
      Payload: JSON.stringify(params.payload),
    };

    lambda.invoke(options, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(JSON.parse(JSON.parse(data.Payload!.toString()).body));
    });
  });
}

export function spawnLocal(params: WorkerParameters) {
  return new Promise((resolve, reject) => {
    const fn = awsHandlers[params.functionName.split('-')[3]];

    if (!fn) {
      reject(new Error(`Cannot find AWS function: '${params.functionName}'`));
    }

    // Simulate the AWS event object
    const event = {
      parameters: params.payload,
    };

    const request = fn(event) as Promise<any>;

    request
      .then((res: any) => {
        const data = JSON.parse(res.body);
        resolve(data);
      })
      .catch((e: Error) => reject(e));
  });
}
