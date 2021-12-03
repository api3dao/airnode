import { readdirSync } from 'fs';
import { join } from 'path';
import { runAndHandleErrors } from '../src';

const main = async () => {
  const allIntegrationsFolders = readdirSync(join(__dirname, '../integrations'), { withFileTypes: true })
    .filter((integration) => integration.isDirectory())
    .map((integration) => join(__dirname, '../integrations', integration.name));

  for (const folder of allIntegrationsFolders) {
    const createConfig = await import(join(folder, 'create-config.ts'));
    const createSecretes = await import(join(folder, 'create-secrets.ts'));

    await createConfig.default(true);
    await createSecretes.default(true);
  }
};

runAndHandleErrors(main);
