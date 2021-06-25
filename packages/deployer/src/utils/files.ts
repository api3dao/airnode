import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { Configurations, Receipts } from 'src/types';
import * as logger from '../utils/logger';
import { validateWithTemplate } from '@api3/validator';

export function parseConfigFile(configPath: string, nodeVersion: string, debug: boolean) {
  logger.debug('Parsing configuration file');

  let configs: Configurations;
  const res = validateWithTemplate(configPath, 'config', true);

  if (res.messages.length) {
    if (!res.valid) {
      logger.fail(JSON.stringify(res.messages));

      if (!debug) {
        throw new Error('Invalid config.json');
      }
    } else {
      logger.warn(JSON.stringify(res.messages));
    }
  }

  try {
    configs = res.specs as Configurations;
  } catch (e) {
    logger.fail('Failed to parse configuration file');
    throw e;
  }

  for (const config of configs) {
    if (nodeVersion !== config.nodeSettings.nodeVersion) {
      logger.fail(
        `nodeVersion under nodeSettings in config.json is ${config.nodeSettings.nodeVersion} while the deployer node version is ${nodeVersion}`
      );
      throw new Error('Attempted to deploy node configuration with the wrong node version');
    }
  }

  return configs;
}

export function parseSecretsFile(secretsPath: string) {
  logger.debug('Parsing secrets file');
  try {
    return dotenv.parse(fs.readFileSync(secretsPath));
  } catch (e) {
    logger.fail('Failed to parse secrets file');
    throw e;
  }
}

export function parseReceiptFile(receiptFilename: string) {
  logger.debug('Parsing receipt file');
  try {
    return JSON.parse(fs.readFileSync(receiptFilename, 'utf8')) as Receipts;
  } catch (e) {
    logger.fail('Failed to parse receipt file');
    throw e;
  }
}
