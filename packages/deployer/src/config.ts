import * as fs from 'fs';
import ora from 'ora';

export function parseFiles(configPath, securityPath) {
  let config, security;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    ora().fail('Failed to parse config.json');
    throw e;
  }
  try {
    security = JSON.parse(fs.readFileSync(securityPath, 'utf8'));
  } catch (e) {
    ora().fail('Failed to parse security.json');
    throw e;
  }
  return {
    apiCredentials: security.apiCredentials,
    chains: config.nodeSettings.chains,
    cloudProvider: config.nodeSettings.cloudProvider,
    configId: config.id,
    nodeVersion: config.nodeSettings.nodeVersion,
    providerIdShort: config.nodeSettings.providerIdShort,
    region: config.nodeSettings.region,
    stage: config.nodeSettings.stage,
  };
}

export function generateServerlessSecretsFile(providerIdShort, apiCredentials) {
  const secrets = {};
  // The mnemonic will be fetched from AWS SSM
  secrets['MASTER_KEY_MNEMONIC'] = `$\{ssm:/airnode/${providerIdShort}/masterKeyMnemonic~true\}`;
  for (const oisTitle in apiCredentials) {
    for (const securityScheme of apiCredentials[oisTitle]) {
      secrets[`${oisTitle}_${securityScheme.securitySchemeName}`] = securityScheme.value;
    }
  }
  fs.writeFileSync('secrets.json', JSON.stringify(secrets, null, 4));
}
