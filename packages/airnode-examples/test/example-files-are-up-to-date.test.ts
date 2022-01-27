import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const allIntegrationsFolders = readdirSync(join(__dirname, '../integrations'), { withFileTypes: true })
  .filter((integration) => integration.isDirectory())
  .map((integration) => join(__dirname, '../integrations', integration.name));

describe('Verifies that all config.example.json files are up to date', () => {
  allIntegrationsFolders.forEach((folder) => {
    it(`checks ${folder}`, async () => {
      const path = join(folder, 'config.example.json');
      const currentConfigFile = readFileSync(path).toString();

      // For some reason, when there is a compile error in the "create-config.ts" the tests fail with no error
      // description. Maybe because the error output (coming from TSC) is decorated and colored. Wrapping in try-catch
      // solves this issue.
      try {
        const createConfig = await import(join(folder, 'create-config.ts'));
        await createConfig.default(true);
      } catch (e) {
        throw new Error((e as Error).message);
      }
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
