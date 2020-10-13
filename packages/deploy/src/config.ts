import * as fs from 'fs';

export function parseFiles(configPath, securityPath) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const security = JSON.parse(fs.readFileSync(securityPath, 'utf8'));
  return {
    apiCredentials: security.apiCredentials,
    chains: config.nodeSettings.chains,
    mnemonic: security.masterKeyMnemonic,
    providerId: config.nodeSettings.providerId,
  };
}
