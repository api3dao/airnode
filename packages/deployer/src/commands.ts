import ora from 'ora';
import { readConfig, generateServerlessConfig } from './config';
import { verifyMnemonicAtSSM, removeMnemonicFromSSM } from './infrastructure';
import { checkProviderRecords } from './evm/evm';
import { deployServerless, removeServerless } from './serverless';
import { writeJSONFile, deriveXpub } from './util';

export async function deploy(args) {
  const { apiCredentials, chains, configId, mnemonic, providerId, providerIdShort } = await readConfig(
    args.configPath,
    args.securityPath
  );
  // The mnemonic may still be undefined here. If so, it will be attempted to be read from AWS SSM.

  // Check if the mnemonic is stored at AWS SSM, store it there if not
  const masterWalletAddress = await verifyMnemonicAtSSM(
    mnemonic,
    providerIdShort,
    args.awsAccessKeyId,
    args.awsSecretKey
  );
  // At this point, we are guaranteed to have both the providerId and the mnemonic defined,
  // and the correct mnemonic is stored at AWS SSM

  // Check if the provider record is created on-chain, warn the user if not
  await checkProviderRecords(providerId, chains, masterWalletAddress);

  // Generate a temporary configuration file for Serverless
  generateServerlessConfig(providerIdShort, apiCredentials);

  // Deploy the serverless functions and remove the temporary configuration file
  await deployServerless(providerIdShort);

  writeJSONFile(`${providerIdShort}.receipt.json`, {
    chainIds: chains.map((chain) => chain.id),
    configId,
    masterWalletAddress,
    providerId,
    providerIdShort,
    xpub: deriveXpub(mnemonic),
  });
  ora().info(`Outputted ${providerIdShort}.receipt.json. This file does not contain any sensitive information.`);
}

export async function removeMnemonic(args) {
  const { providerIdShort } = await readConfig(args.configPath, args.securityPath);
  await removeMnemonicFromSSM(providerIdShort, args.awsAccessKeyId, args.awsSecretKey);
}

export async function removeAirnode(args) {
  const { providerIdShort } = await readConfig(args.configPath, args.securityPath);
  await removeServerless(providerIdShort);
}
