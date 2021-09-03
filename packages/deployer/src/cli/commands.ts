import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { deployAirnode, removeAirnode } from '../infrastructure';
import { Receipts } from '../types';
import {
  deriveMasterWalletAddress,
  deriveXpub,
  generateMnemonic,
  parseConfigFile,
  parseReceiptFile,
  parseSecretsFile,
  shortenAirnodeAddress,
  validateMnemonic,
  verifyMnemonic,
} from '../utils';
import * as logger from '../utils/logger';

export async function deploy(
  configFile: string,
  secretsFile: string,
  receiptFile: string,
  interactive: boolean,
  nodeVersion: string
) {
  const configs = parseConfigFile(configFile, nodeVersion);
  const secrets = parseSecretsFile(secretsFile);

  if (!secrets.MASTER_KEY_MNEMONIC) {
    logger.warn('If you already have a mnemonic, add it to your secrets.env file and restart the deployer');
    const mnemonic = generateMnemonic();
    if (interactive) {
      logger.warn('Write down the 12 word-mnemonic below on a piece of paper and keep it in a safe place\n');
      await verifyMnemonic(mnemonic);
    }
    secrets.MASTER_KEY_MNEMONIC = mnemonic;
  } else if (!validateMnemonic(secrets.MASTER_KEY_MNEMONIC)) {
    logger.fail('MASTER_KEY_MNEMONIC in your secrets.env file is not valid');
    throw new Error('Invalid mnemonic');
  }

  logger.debug('Creating a temporary secrets.json file');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airnode'));
  const tmpSecretsFile = path.join(tmpDir, 'secrets.json');
  fs.writeFileSync(tmpSecretsFile, JSON.stringify(secrets, null, 2));

  const airnodeAddress = deriveMasterWalletAddress(secrets.MASTER_KEY_MNEMONIC);
  const airnodeAddressShort = shortenAirnodeAddress(airnodeAddress);

  const receipts: Receipts = [];
  for (const config of configs) {
    try {
      await deployAirnode(
        airnodeAddressShort,
        config.nodeSettings.stage,
        config.nodeSettings.cloudProvider,
        config.nodeSettings.region,
        configFile,
        tmpSecretsFile
      );
      receipts.push({
        airnodeAddress,
        airnodeAddressShort,
        config: { chains: config.chains, nodeSettings: config.nodeSettings },
        xpub: deriveXpub(secrets.MASTER_KEY_MNEMONIC),
      });
    } catch (err) {
      logger.warn(`Failed deploying configuration, skipping`);
      logger.warn(err.toString());
    }
  }

  logger.debug('Deleting a temporary secrets.json file');
  fs.rmSync(tmpDir, { recursive: true });

  logger.debug('Writing receipt.json file');
  fs.writeFileSync(receiptFile, JSON.stringify(receipts, null, 2));
  logger.info(`Outputted ${receiptFile}\n` + '  This file does not contain any sensitive information.');
}

export async function remove(airnodeAddressShort: string, stage: string, cloudProvider: string, region: string) {
  await removeAirnode(airnodeAddressShort, stage, cloudProvider, region);
}

export async function removeWithReceipt(receiptFilename: string) {
  const receipts = parseReceiptFile(receiptFilename);
  for (const receipt of receipts) {
    try {
      await remove(
        receipt.airnodeAddressShort,
        receipt.config.nodeSettings.stage,
        receipt.config.nodeSettings.cloudProvider,
        receipt.config.nodeSettings.region
      );
    } catch (err) {
      logger.warn(`Failed removing configuration, skipping`);
      logger.warn(err.toString());
    }
  }
}
