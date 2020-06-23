import { main } from '../core';

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
export async function start(event, context) {
  await main();

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Go Serverless v1.0! Your function executed successfully!',
      input: event,
    }),
  };
}
