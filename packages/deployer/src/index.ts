import yargs from 'yargs';
import { parseFiles, processMnemonicAndProviderId, generateServerlessConfig } from './config';
import { verifyMnemonicOnSSM } from './infrastructure';
import { checkProviderRecords } from './evm';
import { deployServerless } from './serverless';
import { shortenProviderId } from './util';

yargs
  .command(
    'deploy',
    'Deploy Airnode',
    {
      configPath: { type: 'string', demandOption: true, alias: 'c' },
      securityPath: { type: 'string', demandOption: true, alias: 's' },
    },
    (args) => {
      deploy(args);
    }
  )
  .help().argv;

async function deploy(args) {
  // Parse the configuration files
  const { apiCredentials, chains, mnemonic: parsedMnemonic, providerId: parsedProviderId } = parseFiles(
    args.configPath,
    args.securityPath
  );
  // Both mnemonic and providerId may be undefined here

  // Process the mnemonic and providerId read from the configuration files
  // Generate new mnemonic if necessary
  const { mnemonic, providerId } = processMnemonicAndProviderId(parsedMnemonic, parsedProviderId);
  // We are guaranteed to have the providerId, but the mnemonic may still be undefined

  // Shorten the providerId to be used as an alias for identifying deployments
  const providerIdShort = shortenProviderId(providerId);

  // Verify that the mnemonic is stored at SSM
  // The mnemonic will be read from SSM if it is not provided
  const masterWalletAddress = await verifyMnemonicOnSSM(mnemonic, providerIdShort);
  // At this point, we are guaranteed to have both the providerId and the mnemonic, and the
  // correct mnemonic is stored at SSM

  // Check if the provider record is created on-chain, warn the user if not
  await checkProviderRecords(providerId, chains, masterWalletAddress);

  // Generate a temporary configuration file for Serverless
  generateServerlessConfig(providerIdShort, apiCredentials);

  // Deploy the serverless functions
  await deployServerless(providerIdShort);
}
