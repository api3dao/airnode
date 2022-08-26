import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { CloudProvider, Config } from '@api3/airnode-node';
import { parseReceipt, receipt } from '@api3/airnode-validator';
import { goSync } from '@api3/promise-utils';
import { logAndReturnError } from './infrastructure';
import * as logger from '../utils/logger';
import { deriveAirnodeAddress, deriveAirnodeXpub, shortenAirnodeAddress } from '../utils';

export function parseSecretsFile(secretsPath: string) {
  logger.debug('Parsing secrets file');

  const goDotenvParse = goSync(() => dotenv.parse(fs.readFileSync(secretsPath)));
  if (!goDotenvParse.success) throw logAndReturnError(`Failed to parse secrets file: ${goDotenvParse.error}`);

  return goDotenvParse.data;
}

export function writeReceiptFile(
  receiptFilename: string,
  mnemonic: string,
  config: Config,
  timestamp: string,
  success: boolean
) {
  const airnodeAddress = deriveAirnodeAddress(mnemonic);
  const airnodeAddressShort = shortenAirnodeAddress(airnodeAddress);
  const receipt: receipt.Receipt = {
    airnodeWallet: {
      airnodeAddress,
      airnodeAddressShort,
      airnodeXpub: deriveAirnodeXpub(mnemonic),
    },
    deployment: {
      airnodeAddressShort,
      cloudProvider: config.nodeSettings.cloudProvider as CloudProvider,
      stage: config.nodeSettings.stage,
      nodeVersion: config.nodeSettings.nodeVersion,
      timestamp,
    },
    success,
  };

  logger.debug('Writing receipt.json file');
  fs.writeFileSync(receiptFilename, JSON.stringify(receipt, null, 2));
  logger.info(`Outputted ${receiptFilename}\n` + '  This file does not contain any sensitive information.');
}

export function parseReceiptFile(receiptFilename: string) {
  logger.debug('Parsing receipt file');

  const goParse = goSync(() => JSON.parse(fs.readFileSync(receiptFilename, 'utf8')));
  if (!goParse.success) throw logAndReturnError(`Failed to parse receipt file: ${goParse.error}`);

  const receipt = goParse.data;

  const validationResult = parseReceipt(receipt);
  if (!validationResult.success) {
    throw logAndReturnError(`Invalid Airnode receipt file: ${validationResult.error}`);
  }

  return receipt as receipt.Receipt;
}
