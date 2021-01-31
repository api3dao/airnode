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
import { checkProviderRecords } from './evm/evm';
import { deployAirnode, removeAirnode } from './infrastructure/serverless';
import {
  writeJSONFile,
  deriveXpub,
  generateMnemonic,
  deriveProviderId,
  shortenProviderId,
  deriveMasterWalletAddress,
} from './util';
import readline from 'readline';

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

function clearLine() {
  readline.moveCursor(process.stdout, 0, -1);
  readline.clearLine(process.stdout, 1);
}

async function verifyMnemonic(mnemonic) {
  const mnemonics = mnemonic.split(' ');
  const shuffledIndexedMnemonics = shuffleArray(
    mnemonics.map((element, index) => {
      return { mnemonic: element, index: index + 1 };
    })
  );

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(mnemonic);
  await ask(rl, `press return to start mnemonic verification, the mnemonic will disappear!`);
  clearLine();
  clearLine();

  let correct = false;
  while (!correct) {
    correct = true;
    for (const indexedMnemonic of shuffledIndexedMnemonics) {
      const word = await ask(rl, `Enter ${indexedMnemonic.index}-th word:`);
      clearLine();
      if (word != indexedMnemonic.mnemonic) {
        correct = false;
        await ask(rl, `Incorrect ${indexedMnemonic.index}-th word, press return to verification again`);
        break;
      }
    }
  }
  console.log('Mnemonic verification passed');
  rl.close();
}

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
  await verifyMnemonic(mnemonic);
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

  const receiptFilename = `${providerIdShort}_${configParams.cloudProvider}_${configParams.region}_${configParams.stage}.receipt.json`;
  writeJSONFile(receiptFilename, {
    chainIds: configParams.chains.map((chain) => chain.id),
    cloudProvider: configParams.cloudProvider,
    configId: configParams.configId,
    masterWalletAddress,
    providerId,
    providerIdShort,
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

  const receiptFilename = `${configParams.providerIdShort}_${configParams.cloudProvider}_${configParams.region}_${configParams.stage}.receipt.json`;
  writeJSONFile(receiptFilename, {
    chainIds: configParams.chains.map((chain) => chain.id),
    cloudProvider: configParams.cloudProvider,
    configId: configParams.configId,
    masterWalletAddress,
    providerId,
    providerIdShort: configParams.providerIdShort,
    region: configParams.region,
    stage: configParams.stage,
    xpub: deriveXpub(mnemonic),
  });
  ora().info(`Outputted ${receiptFilename}\n This file does not contain any sensitive information.`);
}

export async function deployMnemonic(mnemonic, region) {
  await applyTerraformWorkaround(region);
  const providerId = deriveProviderId(mnemonic);
  const providerIdShort = shortenProviderId(providerId);
  if (await ssm.checkIfProviderIdShortExists(providerIdShort)) {
    throw new Error('A mnemonic with matching providerIdShort is already deployed.');
  }
  await ssm.addMnemonic(mnemonic, providerIdShort);
  console.log(`Deployed mnemonic at ${region} under label ${providerIdShort}`);
}

export async function removeWithReceipt(receiptFilename) {
  const receipt = await parseReceipt(receiptFilename);
  await removeAirnode(receipt.providerIdShort, receipt.region, receipt.stage);
  await removeMnemonic(receipt.providerIdShort, receipt.region);
}

export async function removeMnemonic(providerIdShort, region) {
  await applyTerraformWorkaround(region);
  if (!(await ssm.checkIfProviderIdShortExists(providerIdShort))) {
    throw new Error('No mnemonic with this providerIdShort exists at AWS SSM');
  }
  await ssm.removeMnemonic(providerIdShort);
}

export { removeAirnode };
