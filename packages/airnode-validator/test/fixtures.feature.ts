import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
import { parseConfigWithSecrets } from '../src';

const loadAndParseConfiguration = (configPath: string, secretsPath: string) => {
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  const secrets = dotenv.parse(readFileSync(secretsPath));

  return parseConfigWithSecrets(config, secrets);
};

describe('fixture tests', () => {
  it('node (airnode-node/config/config.example.json)', () => {
    const res = loadAndParseConfiguration(
      join(__dirname, '../../airnode-node/config/config.example.json'),
      join(__dirname, '../../airnode-node/config/secrets.example.env')
    );

    expect(res).toEqual({
      success: true,
      data: expect.any(Object),
    });
  });

  it('deployer (airnode-deployer/config/config.example.json)', () => {
    const res = loadAndParseConfiguration(
      join(__dirname, '../../airnode-deployer/config/config.example.json'),
      join(__dirname, '../../airnode-deployer/config/secrets.example.env')
    );

    expect(res).toEqual({
      success: true,
      data: expect.any(Object),
    });
  });

  describe('airnode examples', () => {
    const integrationsPath = join(__dirname, '../../airnode-examples/integrations');
    const integrations = readdirSync(integrationsPath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    for (const integration of integrations) {
      it(`${integration}`, () => {
        const res = loadAndParseConfiguration(
          join(integrationsPath, integration, 'config.example.json'),
          join(integrationsPath, integration, 'secrets.example.env')
        );

        expect(res).toEqual({
          success: true,
          data: expect.any(Object),
        });
      });
    }
  });
});
