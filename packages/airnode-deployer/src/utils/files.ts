import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { CloudProvider, Config, version as getNodeVersion } from '@api3/airnode-node';
import { validateJsonWithTemplate } from '@api3/airnode-validator';
import { validateReceipt } from './validation';
import { Receipt } from '../types';
import * as logger from '../utils/logger';
import { deriveAirnodeAddress, deriveAirnodeXpub, shortenAirnodeAddress } from '../utils';
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
  const airnodeAddress = deriveAirnodeAddress(mnemonic);
  const airnodeAddressShort = shortenAirnodeAddress(airnodeAddress);
  const receipt: Receipt = {
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
    },
    api: {
      ...(config.nodeSettings.heartbeat.enabled ? { heartbeatId: config.nodeSettings.heartbeat.id } : {}),
      // `httpGatewayUrl` comes from Airnode deployment output
      ...commandOutput,
    },
  };

  logger.debug('Writing receipt.json file');
  fs.writeFileSync(receiptFilename, JSON.stringify(receipt, null, 2));
  logger.info(`Outputted ${receiptFilename}\n` + '  This file does not contain any sensitive information.');
}

export function parseReceiptFile(receiptFilename: string, nodeVersion: string) {
  let receipt: any;
  logger.debug('Parsing receipt file');

  try {
    receipt = JSON.parse(fs.readFileSync(receiptFilename, 'utf8'));
  } catch (e) {
    logger.fail('Failed to parse receipt file');
    throw e;
  }

  const validationResult = validateReceipt(receipt, nodeVersion);
  if (!validationResult.valid) {
    logger.fail('Failed to validate receipt file');
    throw new Error(`Invalid Airnode receipt file: ${JSON.stringify(validationResult.messages)}`);
  }

  return receipt as Receipt;
}

export function parseConfig(configPath: string, secrets: Record<string, string>): Config {
  let rawConfig;

  try {
    rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    logger.fail('Failed to parse config file');
    throw e;
  }

  const result = validateJsonWithTemplate(rawConfig, `config@${getNodeVersion()}`, secrets, true);
  const config = result.specs as Config;

  if (config.nodeSettings.skipValidation) {
    logger.warn('Skipping the config validation');
    return config;
  }

  if (config.nodeSettings.cloudProvider.type === 'local') {
    const message = "Deployer can't deploy to 'local' cloud provider";
    logger.fail(message);
    throw new Error(message);
  }

  if (!result.valid) {
    logger.fail(JSON.stringify(result.messages, null, 2));
    throw new Error('Validation of config failed');
  }

  if (result.messages.length) {
    logger.warn(`Validation of config finished with warnings:\n${JSON.stringify(result.messages, null, 2)}`);
  }

  return config;
}
