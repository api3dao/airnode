import { logger } from '@api3/airnode-utilities';
import { go } from '@api3/promise-utils';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
// The following is an indirect @aws-sdk/client-lambda dependency
// For more, see comments in https://github.com/api3dao/airnode/pull/1830
import { Uint8ArrayBlobAdapter } from '@smithy/util-stream';
import { WorkerParameters, WorkerResponse } from '../../types';

export function encodeUtf8(input: string) {
  return new TextEncoder().encode(input) as Uint8ArrayBlobAdapter;
}

export function decodeUtf8(input: Uint8Array): string {
  return new TextDecoder('utf-8').decode(input);
}

export async function spawn(params: WorkerParameters): Promise<WorkerResponse> {
  // Uses the current region by default
  const awsLambdaClient = new LambdaClient({});
  const resolvedName = `airnode-${params.deploymentId}-run`;

  const options = {
    FunctionName: resolvedName,
    Payload: encodeUtf8(JSON.stringify(params.payload)),
  };

  // The Lambda invocation callback populates the error (first argument) only when the invocation fails (e.g. status
  // code is 400) or the request is not parsed properly by the SDK and can't be invoked. For errors and timeouts that
  // happen inside the invoked lambda have "data.FunctionError" and "data.Payload.errorMessage" populated instead.
  // See: https://stackoverflow.com/q/42672023 and https://stackoverflow.com/q/48644093
  const invokeCommand = new InvokeCommand(options);
  const goInvoke = await go(() => awsLambdaClient.send(invokeCommand));
  if (!goInvoke.success) {
    logger.debug(`Lambda invocation or execution failed. ${goInvoke.error}}`);
    throw goInvoke.error;
  }
  const invokeOutput = goInvoke.data;

  if (invokeOutput.FunctionError) {
    logger.debug(`Lambda invocation or execution failed. Response: ${invokeOutput.Payload}`);
    throw invokeOutput.Payload;
  }

  if (!invokeOutput.Payload) {
    const error = new Error('Missing payload in lambda response');
    logger.debug(`Lambda invocation or execution failed. ${error}`);
    throw error;
  }

  const payloadString = decodeUtf8(invokeOutput.Payload);
  const payload = JSON.parse(payloadString);
  const body = JSON.parse(payload.body);

  logger.debug(`Successful Lambda response: ${JSON.stringify(body)}`);
  return body as WorkerResponse;
}
