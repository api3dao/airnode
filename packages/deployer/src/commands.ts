import ora from 'ora';
import { parseFiles, generateServerlessSecrets } from './config';
import {
  removeMnemonicFromSSM,
  checkIfProviderIdShortExistsAtSSM,
  addMnemonicToSSM,
  fetchMnemonicFromSSM,
} from './infrastructure';
import { checkProviderRecords } from './evm/evm';
import { deployServerless, removeServerless } from './serverless';
import {
  writeJSONFile,
  deriveXpub,
  generateMnemonic,
  deriveProviderId,
  shortenProviderId,
  waitForEnter,
  deriveMasterWalletAddress,
} from './util';

export async function deployFirstTime(args, nodeVersion) {
  const {
    apiCredentials,
    chains,
    cloudProvider,
    configId,
    nodeVersion: parsedNodeVersion,
    providerIdShort: parsedProviderIdShort,
    region,
    stage,
  } = await parseFiles(args.configPath, args.securityPath);
  if (parsedProviderIdShort) {
    ora().fail('Found providerIdShort under nodeSettings in config.json');
    throw new Error('config.json must not include providerIdShort when using the command "deploy-first-time"');
  }
  if (cloudProvider !== 'aws') {
    ora().fail('cloudProvider under nodeSettings in config.json is not aws');
    throw new Error('Attempted to use an unsupported cloud provider');
  }
  if (nodeVersion !== parsedNodeVersion) {
    ora().fail(
      `nodeVersion under nodeSettings in config.json is ${parsedNodeVersion} while the deployer node version is ${nodeVersion}`
    );
    throw new Error('Attempted to deploy node configuration with the wrong node version');
  }

  const mnemonic = generateMnemonic();
  const providerId = deriveProviderId(mnemonic);
  const providerIdShort = shortenProviderId(providerId);
  if (await checkIfProviderIdShortExistsAtSSM(providerIdShort)) {
    throw new Error('Randomly generated providerIdShort is already used at SSM. This should not have happened.');
  }

  ora().warn('Write down the 12 word-mnemonic below on a piece of paper and keep it in a safe place\n');
  console.log(mnemonic);
  await waitForEnter();

  await addMnemonicToSSM(mnemonic, providerIdShort);

  const masterWalletAddress = deriveMasterWalletAddress(mnemonic);
  await checkProviderRecords(providerId, chains, masterWalletAddress);

  generateServerlessSecrets(providerIdShort, apiCredentials);
  await deployServerless(providerIdShort, region, stage);

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

export async function redeploy(args, nodeVersion) {
  const {
    apiCredentials,
    chains,
    cloudProvider,
    configId,
    nodeVersion: parsedNodeVersion,
    providerIdShort,
    region,
    stage,
  } = await parseFiles(args.configPath, args.securityPath);
  if (!providerIdShort) {
    ora().fail('Could not find providerIdShort under nodeSettings in config.json');
    throw new Error('config.json must include providerIdShort while using the command "redeploy"');
  }
  if (cloudProvider !== 'aws') {
    ora().fail('cloudProvider under nodeSettings in config.json is not aws');
    throw new Error('Attempted to use an unsupported cloud provider');
  }
  if (nodeVersion !== parsedNodeVersion) {
    ora().fail(
      `nodeVersion under nodeSettings in config.json is ${parsedNodeVersion} while the actual node version is ${nodeVersion}`
    );
    throw new Error('Attempted to deploy node configuration with the wrong node version');
  }

  if (!(await checkIfProviderIdShortExistsAtSSM(providerIdShort))) {
    throw new Error(
      'The mnemonic must be stored at AWS SSM under the name providerIdShort while using the command "redeploy"'
    );
  }

  const mnemonic = await fetchMnemonicFromSSM(providerIdShort);

  const masterWalletAddress = deriveMasterWalletAddress(mnemonic);
  const providerId = deriveProviderId(mnemonic);
  await checkProviderRecords(providerId, chains, masterWalletAddress);

  generateServerlessSecrets(providerIdShort, apiCredentials);
  await deployServerless(providerIdShort, region, stage);

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
  if (!(await checkIfProviderIdShortExistsAtSSM(args.providerIdShort))) {
    throw new Error('No mnemonic with this providerIdShort exists at AWS SSM');
  }
  await removeMnemonicFromSSM(args.providerIdShort);
}

export async function removeAirnode(args) {
  await removeServerless(args.providerIdShort, args.region, args.stage);
}
