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
    chains: config.chains,
    cloudProvider: config.nodeSettings.cloudProvider,
    configId: config.id,
    nodeVersion: config.nodeSettings.nodeVersion,
    airnodeIdShort: config.nodeSettings.airnodeIdShort,
    region: config.nodeSettings.region,
    stage: config.nodeSettings.stage,
  };
}

export function parseReceipt(receiptFilename) {
  try {
    return JSON.parse(fs.readFileSync(receiptFilename, 'utf8'));
  } catch (e) {
    ora().fail('Failed to parse receipt.json');
    throw e;
  }
}

export function checkConfigParameters(configParams, nodeVersion, command) {
  if (command === 'deploy-first-time') {
    if (configParams.airnodeIdShort) {
      ora().fail('Found airnodeIdShort under nodeSettings in config.json');
      throw new Error('config.json must not include airnodeIdShort when using the command "deploy-first-time"');
    }
  } else if (command === 'redeploy') {
    if (!configParams.airnodeIdShort) {
      ora().fail('Could not find airnodeIdShort under nodeSettings in config.json');
      throw new Error('config.json must include airnodeIdShort while using the command "redeploy"');
    }
  }
  if (configParams.cloudProvider !== 'aws') {
    ora().fail('cloudProvider under nodeSettings in config.json is not aws');
    throw new Error('Attempted to use an unsupported cloud provider');
  }
  if (nodeVersion !== configParams.nodeVersion) {
    ora().fail(
      `nodeVersion under nodeSettings in config.json is ${configParams.nodeVersion} while the actual node version is ${nodeVersion}`
    );
    throw new Error('Attempted to deploy node configuration with the wrong node version');
  }
}

export function generateServerlessSecretsFile(airnodeIdShort, apiCredentials) {
  const secrets = {};
  // The mnemonic will be fetched from AWS SSM
  secrets['MASTER_KEY_MNEMONIC'] = `$\{ssm:/airnode/${airnodeIdShort}/masterKeyMnemonic~true\}`;
  for (const oisTitle in apiCredentials) {
    for (const securityScheme of apiCredentials[oisTitle]) {
      secrets[`${oisTitle}_${securityScheme.securitySchemeName}`] = securityScheme.value;
    }
  }
  fs.writeFileSync('secrets.json', JSON.stringify(secrets, null, 4));
}

export function removeServerlessSecretsFile() {
  fs.unlinkSync('secrets.json');
}
