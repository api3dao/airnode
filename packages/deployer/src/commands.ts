import ora from 'ora';
import {
  parseFiles,
  generateServerlessSecretsFile,
  removeServerlessSecretsFile,
  checkConfigParameters,
} from './config';
import * as ssm from './infrastructure/ssm';
import { applyTerraformWorkaround } from './infrastructure/terraform';
import { checkProviderRecords } from './evm/evm';
import { deployAirnode, removeAirnode } from './infrastructure/serverless';
import {
  writeJSONFile,
  deriveXpub,
  generateMnemonic,
  deriveProviderId,
  shortenProviderId,
  waitForEnter,
  deriveMasterWalletAddress,
} from './util';

export async function deployFirstTime(configPath, securityPath, nodeVersion) {
  const configParams = await parseFiles(configPath, securityPath);
  checkConfigParameters(configParams, nodeVersion, 'deploy-first-time');
  await applyTerraformWorkaround(configParams.region);

  const mnemonic = generateMnemonic();
  const providerId = deriveProviderId(mnemonic);
  const providerIdShort = shortenProviderId(providerId);
  if (await ssm.checkIfProviderIdShortExists(providerIdShort)) {
    throw new Error('Randomly generated providerIdShort is already used at SSM. This should not have happened.');
  }

  ora().warn('Write down the 12 word-mnemonic below on a piece of paper and keep it in a safe place\n');
  console.log(mnemonic);
  await waitForEnter();
  await ssm.addMnemonic(mnemonic, providerIdShort);

  const masterWalletAddress = deriveMasterWalletAddress(mnemonic);
  await checkProviderRecords(providerId, configParams.chains, masterWalletAddress);

  generateServerlessSecretsFile(providerIdShort, configParams.apiCredentials);
  try {
    await deployAirnode(providerIdShort, configParams.region, configParams.stage);
    removeServerlessSecretsFile();
  } catch (e) {
    removeServerlessSecretsFile();
    throw e;
  }

  writeJSONFile(`${providerIdShort}.receipt.json`, {
    chainIds: configParams.chains.map((chain) => chain.id),
    configId: configParams.configId,
    masterWalletAddress,
    providerId,
    providerIdShort,
    xpub: deriveXpub(mnemonic),
  });
  ora().info(`Outputted ${providerIdShort}.receipt.json. This file does not contain any sensitive information.`);
}

export async function redeploy(configPath, securityPath, nodeVersion) {
  const configParams = await parseFiles(configPath, securityPath);
  checkConfigParameters(configParams, nodeVersion, 'redeploy');
  await applyTerraformWorkaround(configParams.region);

  if (!(await ssm.checkIfProviderIdShortExists(configParams.providerIdShort))) {
    throw new Error(
      'The mnemonic must be stored at AWS SSM under the name providerIdShort while using the command "redeploy"'
    );
  }
  const mnemonic = await ssm.fetchMnemonic(configParams.providerIdShort);
  const providerId = deriveProviderId(mnemonic);

  const masterWalletAddress = deriveMasterWalletAddress(mnemonic);
  await checkProviderRecords(providerId, configParams.chains, masterWalletAddress);

  generateServerlessSecretsFile(configParams.providerIdShort, configParams.apiCredentials);
  try {
    await deployAirnode(configParams.providerIdShort, configParams.region, configParams.stage);
    removeServerlessSecretsFile();
  } catch (e) {
    removeServerlessSecretsFile();
    throw e;
  }

  writeJSONFile(`${configParams.providerIdShort}.receipt.json`, {
    chainIds: configParams.chains.map((chain) => chain.id),
    configId: configParams.configId,
    masterWalletAddress,
    providerId,
    providerIdShort: configParams.providerIdShort,
    xpub: deriveXpub(mnemonic),
  });
  ora().info(
    `Outputted ${configParams.providerIdShort}.receipt.json. This file does not contain any sensitive information.`
  );
}

export async function removeMnemonic(providerIdShort) {
  if (!(await ssm.checkIfProviderIdShortExists(providerIdShort))) {
    throw new Error('No mnemonic with this providerIdShort exists at AWS SSM');
  }
  await ssm.removeMnemonic(providerIdShort);
}

export { removeAirnode };
