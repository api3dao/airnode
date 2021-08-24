import * as fs from 'fs';
import * as dotenv from 'dotenv';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import { Config } from '@api3/node';
import { Receipt } from '../types';
import * as logger from '../utils/logger';
import { deriveAirnodeId, deriveMasterWalletAddress, deriveXpub, shortenAirnodeId } from '../utils';
import { TerraformAirnodeOutput } from '../infrastructure';

export function parseSecretsFile(secretsPath: string) {
  logger.debug('Parsing secrets file');
  try {
    return dotenv.parse(fs.readFileSync(secretsPath));
  } catch (e) {
    logger.fail('Failed to parse secrets file');
    throw e;
  }
}

export function writeReceiptFile(
  receiptFilename: string,
  mnemonic: string,
  config: Config,
  commandOutput: TerraformAirnodeOutput
) {
  const airnodeId = deriveAirnodeId(mnemonic);
  const receipt = {
    airnodeId,
    airnodeIdShort: shortenAirnodeId(airnodeId),
    // Keeping `chains` and `nodeSettings` fields from the configuration and removing mnemonic
    config: omit(pick(config, ['chains', 'nodeSettings']), 'nodeSettings.airnodeWalletMnemonic'),
    masterWalletAddress: deriveMasterWalletAddress(mnemonic),
    xpub: deriveXpub(mnemonic),
    ...commandOutput,
  };

  logger.debug('Writing receipt.json file');
  fs.writeFileSync(receiptFilename, JSON.stringify(receipt, null, 2));
  logger.info(`Outputted ${receiptFilename}\n` + '  This file does not contain any sensitive information.');
}

export function parseReceiptFile(receiptFilename: string) {
  logger.debug('Parsing receipt file');
  try {
    return JSON.parse(fs.readFileSync(receiptFilename, 'utf8')) as Receipt;
  } catch (e) {
    logger.fail('Failed to parse receipt file');
    throw e;
  }
}
