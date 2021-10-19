import { readIntegrationInfo, runAndHandleErrors } from '../src';

const main = async () => {
  const integrationInfo = readIntegrationInfo();
  // Import the "create-secrets" file from the chosen integration. See the respective "create-secrets.ts" file for
  // details.
  const createSecrets = await import(`../integrations/${integrationInfo.integration}/create-secrets.ts`);
  await createSecrets.default();
};

runAndHandleErrors(main);
