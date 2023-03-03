const cloudProvider = process.env.AIRNODE_CLOUD_PROVIDER;

if (!cloudProvider) {
  throw new Error('Missing cloud specification');
}

function cloudHandler() {
  return import(/* webpackIgnore: true */ `./handlers/${cloudProvider}`);
}

export async function startCoordinator(...args: unknown[]) {
  const handler = await cloudHandler();
  return handler.startCoordinator(...args);
}

export async function run(...args: unknown[]) {
  const handler = await cloudHandler();
  return handler.run(...args);
}

// We shorten function name to allow for shorter cloud resource names
export async function httpReq(...args: unknown[]) {
  const handler = await cloudHandler();
  return handler.processHttpRequest(...args);
}

// We shorten function name to allow for shorter cloud resource names
export async function httpSignedReq(...args: unknown[]) {
  const handler = await cloudHandler();
  return handler.processHttpSignedDataRequest(...args);
}

// We shorten function name to allow for shorter cloud resource names
export async function signOevReq(...args: unknown[]) {
  const handler = await cloudHandler();
  return handler.processSignOevDataRequest(...args);
}
