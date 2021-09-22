import { readIntegrationInfo } from '../src';

async function main() {
  const integrationInfo = readIntegrationInfo();
  const createSecrets = await import(`../integrations/${integrationInfo.integration}/create-secrets.ts`);
  await createSecrets.default();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
