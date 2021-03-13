import ora from 'ora';
import {
  parseFiles,
  parseReceipt,
  generateServerlessSecretsFile,
  removeServerlessSecretsFile,
  checkConfigParameters,
} from './config';
import * as ssm from './infrastructure/ssm';
import { applyTerraformWorkaround } from './infrastructure/terraform';
import { checkAirnodeParameters } from './evm/evm';
import { deployAirnode, removeAirnode } from './infrastructure/serverless';
import {
  writeJSONFile,
  deriveXpub,
  generateMnemonic,
  deriveairnodeId,
  shortenairnodeId,
  deriveMasterWalletAddress,
} from './util';
import { verifyMnemonic } from './io';

export async function deployFirstTime(configPath, securityPath, nodeVersion) {
  const configParams = await parseFiles(configPath, securityPath);
  checkConfigParameters(configParams, nodeVersion, 'deploy-first-time');
  await applyTerraformWorkaround(configParams.region);

  const mnemonic = generateMnemonic();
  const airnodeId = deriveairnodeId(mnemonic);
  const airnodeIdShort = shortenairnodeId(airnodeId);
  if (await ssm.checkIfairnodeIdShortExists(airnodeIdShort)) {
    throw new Error('Randomly generated airnodeIdShort is already used at SSM. This should not have happened.');
  }

  ora().warn('Write down the 12 word-mnemonic below on a piece of paper and keep it in a safe place\n');
  await verifyMnemonic(mnemonic);
  await ssm.addMnemonic(mnemonic, airnodeIdShort);

  const masterWalletAddress = deriveMasterWalletAddress(mnemonic);
  await checkAirnodeParameters(airnodeId, configParams.chains, masterWalletAddress);

  generateServerlessSecretsFile(airnodeIdShort, configParams.apiCredentials);
  try {
    await deployAirnode(airnodeIdShort, configParams.region, configParams.stage);
    removeServerlessSecretsFile();
  } catch (e) {
    removeServerlessSecretsFile();
    throw e;
  }

  const receiptFilename = `${airnodeIdShort}_${configParams.cloudProvider}_${configParams.region}_${configParams.stage}.receipt.json`;
  writeJSONFile(receiptFilename, {
    chainIds: configParams.chains.map((chain) => chain.id),
    cloudProvider: configParams.cloudProvider,
    configId: configParams.configId,
    masterWalletAddress,
    airnodeId,
    airnodeIdShort,
    region: configParams.region,
    stage: configParams.stage,
    xpub: deriveXpub(mnemonic),
  });
  ora().info(`Outputted ${receiptFilename}\n This file does not contain any sensitive information.`);
}

export async function redeploy(configPath, securityPath, nodeVersion) {
  const configParams = await parseFiles(configPath, securityPath);
  checkConfigParameters(configParams, nodeVersion, 'redeploy');
  await applyTerraformWorkaround(configParams.region);

  if (!(await ssm.checkIfairnodeIdShortExists(configParams.airnodeIdShort))) {
    throw new Error(
      'The mnemonic must be stored at AWS SSM under the name airnodeIdShort while using the command "redeploy"'
    );
  }
  const mnemonic = await ssm.fetchMnemonic(configParams.airnodeIdShort);
  const airnodeId = deriveairnodeId(mnemonic);

  const masterWalletAddress = deriveMasterWalletAddress(mnemonic);
  await checkAirnodeParameters(airnodeId, configParams.chains, masterWalletAddress);

  generateServerlessSecretsFile(configParams.airnodeIdShort, configParams.apiCredentials);
  try {
    await deployAirnode(configParams.airnodeIdShort, configParams.region, configParams.stage);
    removeServerlessSecretsFile();
  } catch (e) {
    removeServerlessSecretsFile();
    throw e;
  }

  const receiptFilename = `${configParams.airnodeIdShort}_${configParams.cloudProvider}_${configParams.region}_${configParams.stage}.receipt.json`;
  writeJSONFile(receiptFilename, {
    chainIds: configParams.chains.map((chain) => chain.id),
    cloudProvider: configParams.cloudProvider,
    configId: configParams.configId,
    masterWalletAddress,
    airnodeId,
    airnodeIdShort: configParams.airnodeIdShort,
    region: configParams.region,
    stage: configParams.stage,
    xpub: deriveXpub(mnemonic),
  });
  ora().info(`Outputted ${receiptFilename}\n This file does not contain any sensitive information.`);
}

export async function deployMnemonic(mnemonic, region) {
  await applyTerraformWorkaround(region);
  const airnodeId = deriveairnodeId(mnemonic);
  const airnodeIdShort = shortenairnodeId(airnodeId);
  if (await ssm.checkIfairnodeIdShortExists(airnodeIdShort)) {
    throw new Error('A mnemonic with matching airnodeIdShort is already deployed.');
  }
  await ssm.addMnemonic(mnemonic, airnodeIdShort);
  console.log(`Deployed mnemonic at ${region} under label ${airnodeIdShort}`);
}

export async function removeWithReceipt(receiptFilename) {
  const receipt = await parseReceipt(receiptFilename);
  await removeAirnode(receipt.airnodeIdShort, receipt.region, receipt.stage);
  await removeMnemonic(receipt.airnodeIdShort, receipt.region);
}

export async function removeMnemonic(airnodeIdShort, region) {
  await applyTerraformWorkaround(region);
  if (!(await ssm.checkIfairnodeIdShortExists(airnodeIdShort))) {
    throw new Error('No mnemonic with this airnodeIdShort exists at AWS SSM');
  }
  await ssm.removeMnemonic(airnodeIdShort);
}

export { removeAirnode };
