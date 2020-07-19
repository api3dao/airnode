import * as coordinator from '../core/coordinator';

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
export async function start(event, context) {
  await coordinator.start();

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Go Serverless v1.0! Your function executed successfully!',
      input: event,
    }),
  };
}

export async function initialiseProvider(event, context) {
  const state = await provider.initialise(id);

  return {
    statusCode: 200,
    body: JSON.stringify(state);
  };
}
