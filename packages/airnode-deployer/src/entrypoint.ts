const cloudProvider = process.env.AIRNODE_CLOUD_PROVIDER;

if (!cloudProvider) {
  throw new Error('Missing cloud specification');
}

async function cloudHandler() {
  return await import(/* webpackIgnore: true */ `./handlers/${cloudProvider}`);
}

export async function startCoordinator(...args: unknown[]) {
  const handler = await cloudHandler();
  return await handler.startCoordinator(...args);
}

export async function initializeProvider(...args: unknown[]) {
  const handler = await cloudHandler();
  return await handler.initializeProvider(...args);
}

export async function callApi(...args: unknown[]) {
  const handler = await cloudHandler();
  return await handler.callApi(...args);
}

export async function processProviderRequests(...args: unknown[]) {
  const handler = await cloudHandler();
  return await handler.processProviderRequests(...args);
}

export async function testApi(...args: unknown[]) {
  const handler = await cloudHandler();
  return await handler.testApi(...args);
}
