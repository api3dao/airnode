import AWS from 'aws-sdk';
import * as awsHandlers from '../../../aws/handler';
import { ForkParameters } from '../utils';

export function spawn(params: ForkParameters) {
  // lambda.invoke is synchronous so we need to wrap this in a promise
  return new Promise((resolve, reject) => {
    // TODO: configure lambda environment
    const lambda = new AWS.Lambda();

    const options = {
      FunctionName: params.functionName,
      Payload: JSON.stringify(params.payload),
    };

    // TODO: this will probably break until we get to actually test on AWS
    lambda.invoke(options, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
}

export function spawnLocal(params: ForkParameters) {
  return new Promise((resolve, reject) => {
    const fn = awsHandlers[params.functionName];
    const request = fn(params.payload) as Promise<any>;

    request
      .then((res: any) => {
        const data = JSON.parse(res.body);
        resolve(data);
      })
      .catch((e: Error) => reject(e));
  });
}
