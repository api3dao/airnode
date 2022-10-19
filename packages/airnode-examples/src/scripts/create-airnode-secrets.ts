import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { isMacOrWindows, readIntegrationInfo, runAndHandleErrors } from '../';

const main = async () => {
  const integrationInfo = readIntegrationInfo();
  // Import the "create-secrets" file from the chosen integration. See the respective "create-secrets.ts" file for
  // details.
  const createSecrets = await import(`../../integrations/${integrationInfo.integration}/create-secrets.ts`);
  await createSecrets.default();

  // Windows and MacOS docker users need to change the provider URL if running airnode client on localhost network. See:
  // https://stackoverflow.com/a/24326540 for more information.
  if (integrationInfo.network === 'localhost' && integrationInfo.airnodeType === 'local' && isMacOrWindows()) {
    const secretsPath = join(__dirname, `../../integrations/`, integrationInfo.integration, `secrets.env`);
    const rawSecrets = readFileSync(secretsPath).toString();
    writeFileSync(
      secretsPath,
      rawSecrets
        .replace('PROVIDER_URL=http://127.0.0.1:8545/', 'PROVIDER_URL=http://host.docker.internal:8545')
        .replace(
          'CROSS_CHAIN_PROVIDER_URL=http://127.0.0.1:8545/',
          'CROSS_CHAIN_PROVIDER_URL=http://host.docker.internal:8545'
        )
    );
  }
};

runAndHandleErrors(main);
