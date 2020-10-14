import yargs from 'yargs';
import { parseFiles, processMnemonicAndProviderId, generateServerlessConfig } from './config';
import { verifyMnemonicOnSSM, removeMnemonicFromSSM } from './infrastructure';
import { checkProviderRecords } from './evm';
import { deployServerless, removeServerless } from './serverless';
import { shortenProviderId } from './util';

yargs
  .command(
    'deploy',
    'Deploys Airnode',
    {
      configPath: { type: 'string', demandOption: true, alias: 'c' },
      securityPath: { type: 'string', demandOption: true, alias: 's' },
    },
    (args) => {
      deploy(args);
    }
  )
  .command(
    'remove-mnemonic',
    'Removes mnemonic from AWS SSM',
    {
      configPath: { type: 'string', demandOption: true, alias: 'c' },
      securityPath: { type: 'string', demandOption: true, alias: 's' },
    },
    (args) => {
      removeMnemonic(args);
    }
  )
  .command(
    'remove-airnode',
    'Removes Airnode deployment',
    {
      configPath: { type: 'string', demandOption: true, alias: 'c' },
      securityPath: { type: 'string', demandOption: true, alias: 's' },
    },
    (args) => {
      removeAirnode(args);
    }
  )
  .help().argv;

function getAvailableParameters(configPath, securityPath) {
  // Parse the configuration files
  const { apiCredentials, chains, mnemonic: parsedMnemonic, providerId: parsedProviderId } = parseFiles(
    configPath,
    securityPath
  );
  // Both mnemonic and providerId may be undefined here

  // Process the mnemonic and providerId read from the configuration files
  // Generate new mnemonic if necessary
  const { mnemonic, providerId } = processMnemonicAndProviderId(parsedMnemonic, parsedProviderId);
  // We are guaranteed to have the providerId, but the mnemonic may still be undefined

  // Shorten the providerId to be used as an alias to identify deployments
  const providerIdShort = shortenProviderId(providerId);

  return {mnemonic, providerId, providerIdShort, chains, apiCredentials};
}

async function deploy(args) {
  const {mnemonic, providerId, providerIdShort, chains, apiCredentials} = getAvailableParameters(args.configPath, args.securityPath);

  // Verify that the mnemonic is stored at AWS SSM
  // The mnemonic will be read from AWS SSM if it is not provided
  const masterWalletAddress = await verifyMnemonicOnSSM(mnemonic, providerIdShort);
  // At this point, we are guaranteed to have both the providerId and the mnemonic, and the
  // correct mnemonic is stored at AWS SSM

  // Check if the provider record is created on-chain, warn the user if not
  await checkProviderRecords(providerId, chains, masterWalletAddress);

  // Generate a temporary configuration file for Serverless
  generateServerlessConfig(providerIdShort, apiCredentials);

  // Deploy the serverless functions
  await deployServerless(providerIdShort);
}

async function removeMnemonic(args) {
  const {providerIdShort} = getAvailableParameters(args.configPath, args.securityPath);
  await removeMnemonicFromSSM(providerIdShort);
}

async function removeAirnode(args) {
  const {providerIdShort} = getAvailableParameters(args.configPath, args.securityPath);
  await removeServerless(providerIdShort);
}
