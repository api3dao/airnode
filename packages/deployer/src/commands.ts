import { readConfig, generateServerlessConfig } from './config';
import { verifyMnemonicAtSSM, removeMnemonicFromSSM } from './infrastructure';
import { checkProviderRecords } from './evm/evm';
import { deployServerless, removeServerless } from './serverless';

export async function deploy(args) {
  const { mnemonic, providerId, providerIdShort, chains, apiCredentials } = await readConfig(
    args.configPath,
    args.securityPath
  );
  // The mnemonic may still be undefined here. If so, it will be attempted to be read from AWS SSM.

  // Check if the mnemonic is stored at AWS SSM, store it there if not
  const masterWalletAddress = await verifyMnemonicAtSSM(mnemonic, providerIdShort);
  // At this point, we are guaranteed to have both the providerId and the mnemonic defined,
  // and the correct mnemonic is stored at AWS SSM

  // Check if the provider record is created on-chain, warn the user if not
  await checkProviderRecords(providerId, chains, masterWalletAddress);

  // Generate a temporary configuration file for Serverless
  generateServerlessConfig(providerIdShort, apiCredentials);

  // Deploy the serverless functions and remove the temporary configuration file
  await deployServerless(providerIdShort);
}

export async function removeMnemonic(args) {
  const { providerIdShort } = await readConfig(args.configPath, args.securityPath);
  await removeMnemonicFromSSM(providerIdShort);
}

export async function removeAirnode(args) {
  const { providerIdShort } = await readConfig(args.configPath, args.securityPath);
  await removeServerless(providerIdShort);
}
