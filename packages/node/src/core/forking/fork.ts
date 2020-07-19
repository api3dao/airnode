import AWS from 'aws-sdk';
import * as awsHandlers from '../../aws/handler';
import { config } from '../config';

interface ForkParameters {
  moduleFunctionName: string;
  payload: string;
  serverlessFunctionName: string;
}

function forkAWS(params: ForkParameters) {
  return new Promise((resolve, reject) => {
    // TODO: configure lambda environment
    const lambda = new AWS.Lambda();

    const options = {
      FunctionName: params.serverlessFunctionName,
      Payload: params.payload,
    };

    lambda.invoke(options, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
}

function forkAWSLocal(params: ForkParameters) {
  return new Promise((resolve, reject) => {
    awsHandlers[params.moduleFunctionName];
  });
}

export function fork(params: ForkParameters): Promise<any> {
  switch (config.nodeSettings.cloudProvider) {
    case 'aws':
      return forkAWS(params);

    case 'aws-local':
      return forkAWSLocal(params);
  }
}
