import * as fs from 'fs';
import ora from 'ora';
import { parseConfigFile, parseSecretsFile, parseReceiptFile } from './config';
import { checkAirnodeParameters } from './evm/evm';
import {
  deriveAirnodeId,
  deriveMasterWalletAddress,
  deriveXpub,
  generateMnemonic,
  shortenAirnodeId,
  validateMnemonic,
} from './evm/util';
import { deployAirnode, removeAirnode } from './infrastructure/serverless';
import { verifyMnemonic } from './io';

export async function deploy(configPath, secretsPath, outputFilename, nonStop, nodeVersion) {
  const configs = parseConfigFile(configPath, nodeVersion);
  const secrets = parseSecretsFile(secretsPath);

  if (!secrets.MASTER_KEY_MNEMONIC) {
    ora().warn('If you already have a mnemonic, add it to your secrets.env file and restart the deployer');
    ora().info('Generating new mnemonic');
    const mnemonic = generateMnemonic();
    if (!nonStop) {
      ora().warn('Write down the 12 word-mnemonic below on a piece of paper and keep it in a safe place\n');
      await verifyMnemonic(mnemonic);
    }
    secrets.MASTER_KEY_MNEMONIC = mnemonic;
  } else if (!validateMnemonic(secrets.MASTER_KEY_MNEMONIC)) {
    ora().fail('MASTER_KEY_MNEMONIC in your secrets.env file is not valid');
  }

  const airnodeId = deriveAirnodeId(secrets.MASTER_KEY_MNEMONIC);
  const masterWalletAddress = deriveMasterWalletAddress(secrets.MASTER_KEY_MNEMONIC);
  await checkAirnodeParameters(configs, secrets, airnodeId, masterWalletAddress);

  const airnodeIdShort = shortenAirnodeId(airnodeId);
  const receipts: any[] = [];
  for (const config of configs) {
    try {
      await deployAirnode(
        airnodeIdShort,
        config.nodeSettings.stage,
        config.nodeSettings.cloudProvider,
        config.nodeSettings.region
      );
      receipts.push({
        airnodeId: deriveAirnodeId(secrets.MASTER_KEY_MNEMONIC),
        airnodeIdShort,
        config: { id: config.id, chains: config.chains, nodeSettings: config.nodeSettings },
        masterWalletAddress,
        xpub: deriveXpub(secrets.MASTER_KEY_MNEMONIC),
      });
    } catch {
      ora().warn(`Failed deploying configuration ${config.id}, skipping`);
    }
  }
  fs.writeFileSync(outputFilename, JSON.stringify(receipts, null, 4));
  ora().info(`Outputted ${outputFilename}\n` + '  This file does not contain any sensitive information.');
}

export async function remove(airnodeIdShort, stage, cloudProvider, region) {
  await removeAirnode(airnodeIdShort, stage, cloudProvider, region);
}

export async function removeWithReceipt(receiptFilename) {
  const receipts = await parseReceiptFile(receiptFilename);
  for (const receipt of receipts) {
    try {
      await removeAirnode(
        receipt.airnodeIdShort,
        receipt.config.nodeSettings.stage,
        receipt.config.nodeSettings.cloudProvider,
        receipt.config.nodeSettings.region
      );
    } catch {
      ora().warn(`Failed removing configuration ${receipt.config.id}, skipping`);
    }
  }
}
