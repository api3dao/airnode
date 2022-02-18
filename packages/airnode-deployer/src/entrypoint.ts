const cloudProvider = process.env.AIRNODE_CLOUD_PROVIDER;

if (!cloudProvider) {
  throw new Error('Missing cloud specification');
}

async function cloudHandler() {
  return await import(/* webpackIgnore: true */ `./handlers/${cloudProvider}`);
}

export async function startCoordinator(...args: unknown[]) {
  const handler = await cloudHandler();
  return handler.startCoordinator(...args);
}

export async function run(...args: unknown[]) {
  const handler = await cloudHandler();
  return handler.run(...args);
}

export async function testApi(...args: unknown[]) {
  const handler = await cloudHandler();
  return handler.testApi(...args);
}
