import AWS from 'aws-sdk';
import * as awsHandlers from '../../../aws/handler';
import { WorkerParameters } from '../utils';

export function spawn(params: WorkerParameters) {
  // lambda.invoke is synchronous so we need to wrap this in a promise
  return new Promise((resolve, reject) => {
    // TODO: configure lambda environment
    const lambda = new AWS.Lambda();

    const options = {
      FunctionName: params.functionName,
      Payload: JSON.stringify({ ...params.payload, config: params.config }),
    };

    lambda.invoke(options, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
}

export function spawnLocal(params: WorkerParameters) {
  return new Promise((resolve, reject) => {
    const fn = awsHandlers[params.functionName];

    if (!fn) {
      reject(new Error(`Cannot find AWS function: '${params.functionName}'`));
    }

    // Simulate the AWS event object
    const event = {
      parameters: {
        ...params.payload,
        config: params.config,
      },
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
