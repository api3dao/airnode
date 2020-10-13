import { parseFiles, processMnemonicAndProviderId, generateServerlessConfig } from './config';
import { verifyMnemonicOnSSM } from './infrastructure';
import { checkProviderRecords } from './evm';
import { deploy } from './serverless';

const CONFIG_PATH: string = process.argv[2] || 'config.json';
const SECURITY_PATH: string = process.argv[3] || 'security.json';

async function main() {
  // Parse the configuration files
  const { apiCredentials, chains, mnemonic: parsedMnemonic, providerId: parsedProviderId } = parseFiles(
    CONFIG_PATH,
    SECURITY_PATH
  );
  // Both mnemonic and providerId may be undefined here

  // Process the mnemonic and providerId read from the configuration files
  // Generate new mnemonic if necessary
  const { mnemonic, providerId } = processMnemonicAndProviderId(parsedMnemonic, parsedProviderId);
  // We are guaranteed to have the providerId, but the mnemonic may still be undefined

  // Verify that the mnemonic is stored at SSM
  // The mnemonic will be read from SSM if it is not provided
  const masterWalletAddress = await verifyMnemonicOnSSM(mnemonic, providerId);
  // At this point, we are guaranteed to have both the providerId and the mnemonic, and the
  // correct mnemonic is stored at SSM

  // Check if the provider record is created on-chain, warn the user if not
  await checkProviderRecords(providerId, chains, masterWalletAddress);

  // Generate a temporary configuration file for Serverless
  generateServerlessConfig(providerId, apiCredentials);

  // Deploy the serverless functions
  await deploy();
}

main();
