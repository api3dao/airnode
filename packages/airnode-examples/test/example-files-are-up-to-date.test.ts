import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { go } from '@api3/promise-utils';

const allIntegrationsFolders = readdirSync(join(__dirname, '../integrations'), { withFileTypes: true })
  .filter((integration) => integration.isDirectory())
  .map((integration) => join(__dirname, '../integrations', integration.name));

describe('Verifies that all config.example.json files are up to date', () => {
  allIntegrationsFolders.forEach((folder) => {
    it(`checks ${folder}`, async () => {
      const path = join(folder, 'config.example.json');
      const currentConfigFile = readFileSync(path).toString();

      const goCreateConfig = await go(() =>
        import(join(folder, 'create-config.ts')).then((createConfig) => createConfig.default(true))
      );

      if (!goCreateConfig.success) throw goCreateConfig.error;

      const generatedConfigFile = readFileSync(path).toString();

      // Revert the changes done to the example file
      writeFileSync(path, currentConfigFile);

      expect(generatedConfigFile).toBe(currentConfigFile);
    });
  });
});

describe('Verifies that all secrets.example.env are up to date', () => {
  allIntegrationsFolders.forEach((folder) => {
    it(`checks ${folder}`, async () => {
      const path = join(folder, 'secrets.example.env');
      const currentSecretsFile = readFileSync(path).toString();

      const createSecrets = await import(join(folder, 'create-secrets.ts'));
      await createSecrets.default(true);
      const generatedSecretsFile = readFileSync(path).toString();

      // Revert the changes done to the example file
      writeFileSync(path, currentSecretsFile);

      expect(generatedSecretsFile).toBe(currentSecretsFile);
    });
  });
});
