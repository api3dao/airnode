import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { Config } from '@api3/node';
import { Receipt } from '../types';
import * as logger from '../utils/logger';
import { deriveAirnodeAddress, deriveXpub, shortenAirnodeAddress } from '../utils';
import { DeployAirnodeOutput } from '../infrastructure';

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
  commandOutput: DeployAirnodeOutput
) {
  const heartbeat = config.nodeSettings.heartbeat;
  const airnodeAddress = deriveAirnodeAddress(mnemonic);
  const airnodeAddressShort = shortenAirnodeAddress(airnodeAddress);
  const receipt: Receipt = {
    airnodeWallet: {
      airnodeAddress,
      airnodeAddressShort,
      xpub: deriveXpub(mnemonic),
    },
    deployment: {
      airnodeAddressShort,
      cloudProvider: config.nodeSettings.cloudProvider,
      region: config.nodeSettings.region,
      stage: config.nodeSettings.stage,
      nodeVersion: config.nodeSettings.nodeVersion,
    },
    api: {
      ...(heartbeat?.enabled ? { heartbeatId: heartbeat.id } : {}),
      // `httpGatewayUrl` comes from Airnode deployment output
      ...commandOutput,
    },
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
