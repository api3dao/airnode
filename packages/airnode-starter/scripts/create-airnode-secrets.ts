import { readIntegrationInfo, runAndHandleErrors } from '../src';

const main = async () => {
  const integrationInfo = readIntegrationInfo();
  const createSecrets = await import(`../integrations/${integrationInfo.integration}/create-secrets.ts`);
  // This function will also print out user notice - that secrets.env has been created
  await createSecrets.default();
};

runAndHandleErrors(main);
