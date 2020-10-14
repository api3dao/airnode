import * as fs from 'fs';
import ora from 'ora';
import { deriveProviderId, generateMnemonic, shortenProviderId, waitForEnter } from './util';

export async function readConfig(configPath, securityPath) {
  // Parse the configuration files
  const { apiCredentials, chains, mnemonic: parsedMnemonic, providerId: parsedProviderId } = parseFiles(
    configPath,
    securityPath
  );
  // Both mnemonic and providerId may be undefined here

  // Process the mnemonic and providerId read from the configuration files,
  // generate new mnemonic if necessary
  const { mnemonic, providerId } = await processMnemonicAndProviderId(parsedMnemonic, parsedProviderId);
  // We are guaranteed to have the providerId, but the mnemonic may still be undefined

  // Shorten the providerId to be used as an alias to identify deployments
  const providerIdShort = shortenProviderId(providerId);

  return { mnemonic, providerId, providerIdShort, chains, apiCredentials };
}

function parseFiles(configPath, securityPath) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const security = JSON.parse(fs.readFileSync(securityPath, 'utf8'));
  return {
    apiCredentials: security.apiCredentials,
    chains: config.nodeSettings.chains,
    mnemonic: security.masterKeyMnemonic,
    providerId: config.nodeSettings.providerId,
  };
}

async function processMnemonicAndProviderId(mnemonic, providerId) {
  if (mnemonic) {
    ora().succeed('Found the mnemonic in security.json');
    if (!providerId) {
      ora().info('Did not find the providerId in config.json');
      providerId = deriveProviderId(mnemonic);
      ora().succeed('Derived the providerId from the mnemonic');
    } else {
      // The mnemonic from security.json and the providerId from config.json should be
      // consistent if the two files have been validated.
      ora().succeed('Found the providerId in config.json');
    }
  } else {
    ora().info('Did not find the mnemonic in security.json');
    if (!providerId) {
      ora().info('Did not find the providerId in config.json');
      mnemonic = generateMnemonic();
      providerId = deriveProviderId(mnemonic);
      ora().succeed('Generated a new mnemonic-providerId pair');
      ora().warn('Write down the mnemonic below on a piece of paper and keep at a safe place\n');
      console.log(mnemonic);
      await waitForEnter();
    } else {
      ora().succeed('Found the providerId in config.json');
      ora().info('Will look for the mnemonic at AWS SSM');
    }
  }
  return { mnemonic, providerId };
}

export function generateServerlessConfig(providerIdShort, apiCredentials) {
  const secrets = {};
  secrets['MASTER_KEY_MNEMONIC'] = `$\{ssm:/airnode/${providerIdShort}/masterKeyMnemonic~true\}`;
  for (const oisTitle in apiCredentials) {
    for (const securityScheme of apiCredentials[oisTitle]) {
      secrets[`${oisTitle}_${securityScheme.securitySchemeName}`] = securityScheme.value;
    }
  }
  fs.writeFileSync('secrets.json', JSON.stringify(secrets, null, 4));
}
