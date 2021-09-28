import { readIntegrationInfo, runAndHandleErrors } from '../src';

async function main() {
  const integrationInfo = readIntegrationInfo();
  // TODO: What to do if this file is misssing?
  const createSecrets = await import(`../integrations/${integrationInfo.integration}/create-secrets.ts`);
  await createSecrets.default();
}

runAndHandleErrors(main);
