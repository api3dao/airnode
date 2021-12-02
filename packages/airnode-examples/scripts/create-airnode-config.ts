import { readIntegrationInfo, runAndHandleErrors } from '../src';

const main = async () => {
  const integrationInfo = readIntegrationInfo();
  // Import the "create-config" file from the chosen integration. See the respective "create-config.ts" file for
  // details.
  const createConfig = await import(`../integrations/${integrationInfo.integration}/create-config.ts`);
  await createConfig.default();
};

runAndHandleErrors(main);
